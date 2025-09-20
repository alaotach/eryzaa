#!/usr/bin/env python3
"""
Eryzaa Universal Training Script
Supports multiple frameworks and model types
"""

import os
import sys
import json
import argparse
import logging
from pathlib import Path
from typing import Dict, Any, Optional
import time
import yaml

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader
import torchvision
import transformers
import wandb
import mlflow

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class UniversalTrainer:
    """Universal trainer that supports multiple frameworks and model types"""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.model = None
        self.optimizer = None
        self.criterion = None
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        
        # Initialize tracking
        self.init_tracking()
    
    def init_tracking(self):
        """Initialize experiment tracking"""
        if self.config.get("use_wandb", False):
            wandb.init(
                project=self.config.get("project_name", "eryzaa-training"),
                config=self.config
            )
        
        if self.config.get("use_mlflow", True):
            mlflow.start_run()
            mlflow.log_params(self.config)
    
    def load_model(self):
        """Load model based on configuration"""
        model_type = self.config["model"]["type"]
        
        if model_type == "resnet":
            self.model = self.create_resnet()
        elif model_type == "bert":
            self.model = self.create_bert()
        elif model_type == "gpt":
            self.model = self.create_gpt()
        elif model_type == "yolo":
            self.model = self.create_yolo()
        elif model_type == "custom":
            self.model = self.create_custom_model()
        else:
            raise ValueError(f"Unsupported model type: {model_type}")
        
        self.model.to(self.device)
        logger.info(f"Loaded {model_type} model on {self.device}")
    
    def create_resnet(self):
        """Create ResNet model for image classification"""
        from torchvision.models import resnet50, ResNet50_Weights
        
        model = resnet50(weights=ResNet50_Weights.DEFAULT)
        num_classes = self.config["model"].get("num_classes", 1000)
        
        if num_classes != 1000:
            model.fc = nn.Linear(model.fc.in_features, num_classes)
        
        return model
    
    def create_bert(self):
        """Create BERT model for NLP tasks"""
        from transformers import BertForSequenceClassification
        
        model_name = self.config["model"].get("pretrained", "bert-base-uncased")
        num_labels = self.config["model"].get("num_classes", 2)
        
        model = BertForSequenceClassification.from_pretrained(
            model_name,
            num_labels=num_labels
        )
        
        return model
    
    def create_gpt(self):
        """Create GPT model for text generation"""
        from transformers import GPT2LMHeadModel
        
        model_name = self.config["model"].get("pretrained", "gpt2")
        model = GPT2LMHeadModel.from_pretrained(model_name)
        
        return model
    
    def create_yolo(self):
        """Create YOLO model for object detection"""
        import ultralytics
        
        model_name = self.config["model"].get("pretrained", "yolov8n.pt")
        model = ultralytics.YOLO(model_name)
        
        return model
    
    def create_custom_model(self):
        """Create custom model from configuration"""
        # This would be implemented based on specific requirements
        raise NotImplementedError("Custom model creation not implemented yet")
    
    def load_dataset(self):
        """Load dataset based on configuration"""
        dataset_config = self.config["dataset"]
        dataset_type = dataset_config["type"]
        
        if dataset_type == "imagenet":
            return self.load_imagenet()
        elif dataset_type == "coco":
            return self.load_coco()
        elif dataset_type == "text":
            return self.load_text_dataset()
        elif dataset_type == "custom":
            return self.load_custom_dataset()
        else:
            raise ValueError(f"Unsupported dataset type: {dataset_type}")
    
    def load_imagenet(self):
        """Load ImageNet dataset"""
        from torchvision import transforms
        
        transform = transforms.Compose([
            transforms.Resize(256),
            transforms.CenterCrop(224),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])
        
        dataset_path = self.config["dataset"]["path"]
        
        train_dataset = torchvision.datasets.ImageFolder(
            root=os.path.join(dataset_path, "train"),
            transform=transform
        )
        
        val_dataset = torchvision.datasets.ImageFolder(
            root=os.path.join(dataset_path, "val"),
            transform=transform
        )
        
        batch_size = self.config["training"].get("batch_size", 32)
        
        train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True, num_workers=4)
        val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False, num_workers=4)
        
        return train_loader, val_loader
    
    def load_coco(self):
        """Load COCO dataset"""
        # COCO dataset loading implementation
        raise NotImplementedError("COCO dataset loading not implemented yet")
    
    def load_text_dataset(self):
        """Load text dataset"""
        # Text dataset loading implementation
        raise NotImplementedError("Text dataset loading not implemented yet")
    
    def load_custom_dataset(self):
        """Load custom dataset"""
        # Custom dataset loading implementation
        raise NotImplementedError("Custom dataset loading not implemented yet")
    
    def setup_training(self):
        """Setup optimizer and loss function"""
        training_config = self.config["training"]
        
        # Setup optimizer
        optimizer_type = training_config.get("optimizer", "adam")
        learning_rate = training_config.get("learning_rate", 0.001)
        
        if optimizer_type == "adam":
            self.optimizer = optim.Adam(self.model.parameters(), lr=learning_rate)
        elif optimizer_type == "sgd":
            momentum = training_config.get("momentum", 0.9)
            self.optimizer = optim.SGD(self.model.parameters(), lr=learning_rate, momentum=momentum)
        elif optimizer_type == "adamw":
            weight_decay = training_config.get("weight_decay", 0.01)
            self.optimizer = optim.AdamW(self.model.parameters(), lr=learning_rate, weight_decay=weight_decay)
        
        # Setup loss function
        loss_type = training_config.get("loss", "crossentropy")
        
        if loss_type == "crossentropy":
            self.criterion = nn.CrossEntropyLoss()
        elif loss_type == "mse":
            self.criterion = nn.MSELoss()
        elif loss_type == "bce":
            self.criterion = nn.BCEWithLogitsLoss()
    
    def train_epoch(self, train_loader, epoch):
        """Train for one epoch"""
        self.model.train()
        total_loss = 0.0
        correct = 0
        total = 0
        
        for batch_idx, (data, target) in enumerate(train_loader):
            data, target = data.to(self.device), target.to(self.device)
            
            self.optimizer.zero_grad()
            output = self.model(data)
            loss = self.criterion(output, target)
            loss.backward()
            self.optimizer.step()
            
            total_loss += loss.item()
            
            # Calculate accuracy
            _, predicted = output.max(1)
            total += target.size(0)
            correct += predicted.eq(target).sum().item()
            
            if batch_idx % 100 == 0:
                logger.info(f'Epoch: {epoch}, Batch: {batch_idx}, Loss: {loss.item():.4f}')
        
        avg_loss = total_loss / len(train_loader)
        accuracy = 100.0 * correct / total
        
        return avg_loss, accuracy
    
    def validate(self, val_loader):
        """Validate the model"""
        self.model.eval()
        total_loss = 0.0
        correct = 0
        total = 0
        
        with torch.no_grad():
            for data, target in val_loader:
                data, target = data.to(self.device), target.to(self.device)
                output = self.model(data)
                loss = self.criterion(output, target)
                
                total_loss += loss.item()
                
                _, predicted = output.max(1)
                total += target.size(0)
                correct += predicted.eq(target).sum().item()
        
        avg_loss = total_loss / len(val_loader)
        accuracy = 100.0 * correct / total
        
        return avg_loss, accuracy
    
    def save_model(self, epoch, is_best=False):
        """Save model checkpoint"""
        checkpoint = {
            'epoch': epoch,
            'model_state_dict': self.model.state_dict(),
            'optimizer_state_dict': self.optimizer.state_dict(),
            'config': self.config
        }
        
        # Save checkpoint
        checkpoint_path = Path(self.config["output_dir"]) / f"checkpoint_epoch_{epoch}.pt"
        torch.save(checkpoint, checkpoint_path)
        
        # Save best model
        if is_best:
            best_path = Path(self.config["output_dir"]) / "best_model.pt"
            torch.save(checkpoint, best_path)
            
            # Save for inference
            model_path = Path(self.config["output_dir"]) / "model.pt"
            torch.save(self.model, model_path)
            
            # Save config
            config_path = Path(self.config["output_dir"]) / "config.json"
            with open(config_path, 'w') as f:
                json.dump(self.config, f, indent=2)
    
    def train(self):
        """Main training loop"""
        logger.info("Starting training...")
        
        # Load model and dataset
        self.load_model()
        train_loader, val_loader = self.load_dataset()
        self.setup_training()
        
        # Training parameters
        epochs = self.config["training"]["epochs"]
        best_accuracy = 0.0
        
        # Create output directory
        output_dir = Path(self.config["output_dir"])
        output_dir.mkdir(parents=True, exist_ok=True)
        
        for epoch in range(epochs):
            start_time = time.time()
            
            # Train
            train_loss, train_acc = self.train_epoch(train_loader, epoch)
            
            # Validate
            val_loss, val_acc = self.validate(val_loader)
            
            epoch_time = time.time() - start_time
            
            # Log metrics
            logger.info(f'Epoch {epoch}: Train Loss: {train_loss:.4f}, Train Acc: {train_acc:.2f}%, '
                       f'Val Loss: {val_loss:.4f}, Val Acc: {val_acc:.2f}%, Time: {epoch_time:.2f}s')
            
            # Track with wandb/mlflow
            if self.config.get("use_wandb", False):
                wandb.log({
                    "epoch": epoch,
                    "train_loss": train_loss,
                    "train_accuracy": train_acc,
                    "val_loss": val_loss,
                    "val_accuracy": val_acc,
                    "epoch_time": epoch_time
                })
            
            if self.config.get("use_mlflow", True):
                mlflow.log_metrics({
                    "train_loss": train_loss,
                    "train_accuracy": train_acc,
                    "val_loss": val_loss,
                    "val_accuracy": val_acc,
                    "epoch_time": epoch_time
                }, step=epoch)
            
            # Save checkpoint
            is_best = val_acc > best_accuracy
            if is_best:
                best_accuracy = val_acc
            
            self.save_model(epoch, is_best)
        
        logger.info(f"Training completed! Best validation accuracy: {best_accuracy:.2f}%")
        
        # Finish tracking
        if self.config.get("use_wandb", False):
            wandb.finish()
        
        if self.config.get("use_mlflow", True):
            mlflow.end_run()

def load_config(config_path: str) -> Dict[str, Any]:
    """Load training configuration"""
    with open(config_path, 'r') as f:
        if config_path.endswith('.yaml') or config_path.endswith('.yml'):
            return yaml.safe_load(f)
        else:
            return json.load(f)

def main():
    parser = argparse.ArgumentParser(description="Eryzaa Universal Training Script")
    parser.add_argument("--config", type=str, required=True, help="Path to configuration file")
    parser.add_argument("--output_dir", type=str, help="Override output directory")
    
    args = parser.parse_args()
    
    # Load configuration
    config = load_config(args.config)
    
    # Override output directory if provided
    if args.output_dir:
        config["output_dir"] = args.output_dir
    
    # Create trainer and start training
    trainer = UniversalTrainer(config)
    trainer.train()

if __name__ == "__main__":
    main()
