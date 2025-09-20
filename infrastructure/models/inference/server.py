#!/usr/bin/env python3
"""
Eryzaa Model Inference Server
Fast API server for serving trained AI models
"""

import os
import asyncio
import logging
from pathlib import Path
from typing import Dict, List, Optional, Any
import json

import torch
import numpy as np
from PIL import Image
from fastapi import FastAPI, HTTPException, UploadFile, File, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Eryzaa Model Inference API",
    description="High-performance model inference server",
    version="1.0.0"
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global model registry
model_registry: Dict[str, Any] = {}

class PredictionRequest(BaseModel):
    model_id: str
    input_data: Any
    parameters: Optional[Dict[str, Any]] = {}

class PredictionResponse(BaseModel):
    model_id: str
    predictions: Any
    confidence: Optional[float] = None
    processing_time: float

class ModelInfo(BaseModel):
    model_id: str
    name: str
    version: str
    framework: str
    input_shape: List[int]
    output_shape: List[int]
    description: str
    loaded: bool

@app.on_startup
async def startup_event():
    """Load available models on startup"""
    await load_available_models()

async def load_available_models():
    """Load all available models from the models directory"""
    model_path = Path(os.getenv("MODEL_PATH", "/models"))
    logger.info(f"Loading models from {model_path}")
    
    if not model_path.exists():
        logger.warning(f"Model path {model_path} does not exist")
        return
    
    for model_dir in model_path.iterdir():
        if model_dir.is_dir():
            try:
                await load_model(model_dir.name, model_dir)
            except Exception as e:
                logger.error(f"Failed to load model {model_dir.name}: {e}")

async def load_model(model_id: str, model_path: Path):
    """Load a specific model"""
    config_file = model_path / "config.json"
    
    if not config_file.exists():
        logger.warning(f"No config.json found for model {model_id}")
        return
    
    with open(config_file) as f:
        config = json.load(f)
    
    framework = config.get("framework", "pytorch")
    
    if framework == "pytorch":
        model_file = model_path / "model.pt"
        if model_file.exists():
            model = torch.load(model_file, map_location="cpu")
            if torch.cuda.is_available():
                model = model.cuda()
            model.eval()
            model_registry[model_id] = {
                "model": model,
                "config": config,
                "framework": framework
            }
            logger.info(f"Loaded PyTorch model: {model_id}")
    
    elif framework == "tensorflow":
        # TensorFlow model loading
        try:
            import tensorflow as tf
            model = tf.keras.models.load_model(str(model_path / "model"))
            model_registry[model_id] = {
                "model": model,
                "config": config,
                "framework": framework
            }
            logger.info(f"Loaded TensorFlow model: {model_id}")
        except Exception as e:
            logger.error(f"Failed to load TensorFlow model {model_id}: {e}")
    
    elif framework == "onnx":
        # ONNX model loading
        try:
            import onnxruntime as ort
            providers = ['CUDAExecutionProvider', 'CPUExecutionProvider'] if torch.cuda.is_available() else ['CPUExecutionProvider']
            session = ort.InferenceSession(str(model_path / "model.onnx"), providers=providers)
            model_registry[model_id] = {
                "model": session,
                "config": config,
                "framework": framework
            }
            logger.info(f"Loaded ONNX model: {model_id}")
        except Exception as e:
            logger.error(f"Failed to load ONNX model {model_id}: {e}")

@app.get("/")
async def root():
    return {"message": "Eryzaa Model Inference Server", "status": "running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "models_loaded": len(model_registry)}

@app.get("/models", response_model=List[ModelInfo])
async def list_models():
    """List all available models"""
    models = []
    for model_id, model_data in model_registry.items():
        config = model_data["config"]
        models.append(ModelInfo(
            model_id=model_id,
            name=config.get("name", model_id),
            version=config.get("version", "1.0.0"),
            framework=model_data["framework"],
            input_shape=config.get("input_shape", []),
            output_shape=config.get("output_shape", []),
            description=config.get("description", ""),
            loaded=True
        ))
    return models

@app.post("/predict", response_model=PredictionResponse)
async def predict(request: PredictionRequest):
    """Make predictions using the specified model"""
    import time
    start_time = time.time()
    
    if request.model_id not in model_registry:
        raise HTTPException(status_code=404, detail=f"Model {request.model_id} not found")
    
    model_data = model_registry[request.model_id]
    model = model_data["model"]
    framework = model_data["framework"]
    
    try:
        if framework == "pytorch":
            predictions = await predict_pytorch(model, request.input_data, request.parameters)
        elif framework == "tensorflow":
            predictions = await predict_tensorflow(model, request.input_data, request.parameters)
        elif framework == "onnx":
            predictions = await predict_onnx(model, request.input_data, request.parameters)
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported framework: {framework}")
        
        processing_time = time.time() - start_time
        
        return PredictionResponse(
            model_id=request.model_id,
            predictions=predictions,
            processing_time=processing_time
        )
    
    except Exception as e:
        logger.error(f"Prediction error for model {request.model_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

async def predict_pytorch(model, input_data, parameters):
    """Make predictions using PyTorch model"""
    if isinstance(input_data, list):
        input_tensor = torch.tensor(input_data, dtype=torch.float32)
    else:
        input_tensor = torch.tensor([input_data], dtype=torch.float32)
    
    if torch.cuda.is_available():
        input_tensor = input_tensor.cuda()
    
    with torch.no_grad():
        output = model(input_tensor)
        if torch.cuda.is_available():
            output = output.cpu()
        return output.numpy().tolist()

async def predict_tensorflow(model, input_data, parameters):
    """Make predictions using TensorFlow model"""
    import tensorflow as tf
    
    if isinstance(input_data, list):
        input_array = np.array(input_data, dtype=np.float32)
    else:
        input_array = np.array([input_data], dtype=np.float32)
    
    predictions = model.predict(input_array)
    return predictions.tolist()

async def predict_onnx(model, input_data, parameters):
    """Make predictions using ONNX model"""
    if isinstance(input_data, list):
        input_array = np.array(input_data, dtype=np.float32)
    else:
        input_array = np.array([input_data], dtype=np.float32)
    
    input_name = model.get_inputs()[0].name
    outputs = model.run(None, {input_name: input_array})
    return outputs[0].tolist()

@app.post("/predict/image")
async def predict_image(model_id: str, file: UploadFile = File(...)):
    """Make predictions on uploaded images"""
    if model_id not in model_registry:
        raise HTTPException(status_code=404, detail=f"Model {model_id} not found")
    
    try:
        # Read and process image
        image_data = await file.read()
        image = Image.open(io.BytesIO(image_data))
        
        # Convert to RGB if necessary
        if image.mode != "RGB":
            image = image.convert("RGB")
        
        # Preprocess image (this would depend on the specific model)
        # For now, just resize to a standard size
        image = image.resize((224, 224))
        image_array = np.array(image) / 255.0
        
        # Make prediction
        request = PredictionRequest(
            model_id=model_id,
            input_data=image_array.tolist()
        )
        
        return await predict(request)
    
    except Exception as e:
        logger.error(f"Image prediction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/models/{model_id}/load")
async def load_model_endpoint(model_id: str, background_tasks: BackgroundTasks):
    """Load a specific model"""
    model_path = Path(os.getenv("MODEL_PATH", "/models")) / model_id
    
    if not model_path.exists():
        raise HTTPException(status_code=404, detail=f"Model directory {model_id} not found")
    
    background_tasks.add_task(load_model, model_id, model_path)
    return {"message": f"Loading model {model_id}"}

@app.delete("/models/{model_id}")
async def unload_model(model_id: str):
    """Unload a model from memory"""
    if model_id not in model_registry:
        raise HTTPException(status_code=404, detail=f"Model {model_id} not found")
    
    del model_registry[model_id]
    return {"message": f"Model {model_id} unloaded"}

@app.get("/metrics")
async def get_metrics():
    """Get server metrics"""
    import psutil
    
    return {
        "models_loaded": len(model_registry),
        "memory_usage": psutil.virtual_memory().percent,
        "cpu_usage": psutil.cpu_percent(),
        "gpu_available": torch.cuda.is_available(),
        "gpu_count": torch.cuda.device_count() if torch.cuda.is_available() else 0
    }

if __name__ == "__main__":
    port = int(os.getenv("API_PORT", 8000))
    uvicorn.run(
        "server:app",
        host="0.0.0.0",
        port=port,
        reload=False,
        workers=1
    )
