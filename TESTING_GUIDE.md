# 🧪 Eryzaa Testing Guide

## ✅ How to Test Everything

Your Eryzaa platform is now ready for testing! Here's exactly how to test all three access types and the complete system.

## 🚀 Quick Setup & Testing

### 1. **Build All Applications**
```bash
cd /home/aloo/eryzaa

# Build everything (cross-platform)
./tools/build.sh --all --package

# Or build just for current platform
cargo build --release
```

### 2. **Run the Desktop Applications**

**⚠️ IMPORTANT: SSH User Management Setup Required**

Before testing SSH features, you need to start the privileged SSH service:

```bash
# Start the SSH management service (requires sudo once)
sudo /home/aloo/eryzaa/tools/ssh_service.sh daemon &

# Or start it in a separate terminal to see logs
sudo /home/aloo/eryzaa/tools/ssh_service.sh daemon
```

Then run the GUI applications:

```bash
# Run GUI Client (for renting/using resources)
./target/release/eryzaa-client

# Run GUI Rental Server (for sharing your PC) - WITH SSH MANAGEMENT
./target/release/eryzaa-rental
```

**✅ SUCCESS: Both GUIs should open!** 

### 🔐 **Test SSH User Management (NEW!)**

#### **Step 0: Start SSH Service (Required)**
```bash
# This runs as a background service and handles user creation/deletion
sudo /home/aloo/eryzaa/tools/ssh_service.sh daemon &

# Check if it's running
ls -la /tmp/eryzaa_ssh_service.sock
```

#### **Step 1: Test the Rental GUI SSH Features**
1. **Open the Rental GUI**: `./target/release/eryzaa-rental`
2. **Go to "SSH Users" tab** - this is the new feature!
3. **Click "Test Job Creation"** to simulate a paying customer
4. **Watch as SSH user gets created** (only one at a time!)
5. **Copy the SSH command** to connect

#### **Step 2: Test the Web Interface**
1. **Start the web backend** (if not running):
   ```bash
   # The Node.js backend should be running on port 5000
   cd /home/aloo/eryzaa/backend && npm start
   ```

2. **Start the React frontend**:
   ```bash
   cd /home/aloo/eryzaa/project && npm run dev
   ```

3. **Visit the Jobs Display**: `http://localhost:5173/jobs-display`
4. **See real-time job info**: Active jobs, rental nodes, SSH access details

#### **Step 3: Test End-to-End SSH Flow**
1. **Rental side**: Create test job in SSH Users tab
2. **Web interface**: See the job appear with SSH details
3. **Client side**: Use the displayed SSH command to connect
4. **Rental side**: Terminate the job to delete SSH access

### 3. **Test the Complete Integration**

### 3. **Test the Complete Integration**

#### 🖥️ **Test SSH Access (ONE USER ONLY)**
1. **Start a Rental Server:**
   - Run: `./target/release/eryzaa-rental`
   - Go to "SSH Users" tab
   - Click "🧪 Test Job Creation" to simulate payment
   - ⚠️ **ONLY ONE SSH USER ALLOWED** - this enforces exclusivity!

2. **Connect as Client:**
   - Copy the SSH command from the rental GUI
   - Open terminal and paste the SSH command
   - You now have exclusive access to that rental node!

3. **Test on Website:**
   - Visit: `http://localhost:5173/jobs-display`
   - See your active job with SSH details
   - See "ONLY ONE USER" warnings

#### 🌐 **Test Web Integration**
- **Backend running**: Node.js on port 5000 ✅
- **Frontend**: React on port 5173
- **Real-time updates**: Jobs display every 10 seconds
- **SSH info display**: Copy-paste SSH commands

#### 🧠 **Test AI Model Training**
1. **Start Model Training Platform:**
   ```bash
   cd infrastructure/models
   docker-compose up model-trainer
   ```

2. **Use GUI Interface:**
   - Open GUI Client → "AI Training" tab
   - Select a model (GPT-2, BERT, ResNet-50, YOLO-v8)
   - Select a dataset (ImageNet, COCO, WikiText)
   - Click "Start Training"

#### ⚡ **Test Edge Computing**
1. **Start Edge Platform:**
   ```bash
   cd infrastructure/models
   docker-compose up -d
   ```

2. **Use GPU Nodes:**
   - Open GUI Client → "Edge Computing" tab
   - View available GPU nodes
   - Click "Deploy Job" on any available node
   - Monitor job progress

## 🌍 **Cross-Platform Testing**

### **Linux** (Current Platform)
```bash
# Native build and test
cargo build --release
./target/release/eryzaa-client
```

### **Windows** (Cross-compile)
```bash
# Build Windows version
./tools/build.sh --target x86_64-pc-windows-gnu --package
# Windows binaries will be in dist/windows/
```

### **macOS** (Cross-compile)
```bash
# Build macOS version (if on macOS)
./tools/build.sh --target x86_64-apple-darwin --package
```

## 💰 **Blockchain Testing**

### 1. **Deploy Smart Contracts** (Test Network)
```bash
# Deploy to Avalanche Fuji testnet
./tools/build.sh --deploy

# Or deploy manually
npm install
npx hardhat run blockchain/scripts/deploy.js --network fuji
```

### 2. **Test Payment Flow**
1. Get test AVAX from Fuji faucet
2. Use GUI to register as provider or client
3. Create compute jobs and test escrow payments
4. Test dispute resolution

## 🔧 **Component Testing**

### **GUI Applications**
```bash
# Test individual components
cargo run --bin eryzaa-client
cargo run --bin eryzaa-rental
```

### **Infrastructure Services**
```bash
# Test model inference API
cd infrastructure/models
docker-compose up model-inference
curl http://localhost:8000/health

# Test dataset management
docker-compose up dataset-manager
curl http://localhost:8001/datasets
```

### **Build System**
```bash
# Test build scripts
./tools/build.sh --help
./tools/build.sh --package
python3 tools/launcher.py
```

## 📱 **User Experience Testing**

### **Rental Flow (PC Owner)**
1. Download Eryzaa GUI Rental app
2. Run the application
3. Go through the setup wizard:
   - Install ZeroTier
   - Join private network
   - Set up SSH access
   - Configure pricing (default 0.1 AVAX/hour)
4. Start sharing your PC
5. Monitor earnings and connections

### **Client Flow (Resource User)**
1. Download Eryzaa GUI Client app
2. Choose access type:
   - **SSH**: Connect to shared PCs
   - **AI Training**: Train models with datasets
   - **Edge Computing**: Run multi-GPU workloads
3. Make payment with AVAX
4. Use resources and monitor costs

## 🌐 **Website Deployment** (For Downloads)

Create a simple download page:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Eryzaa - Download</title>
</head>
<body>
    <h1>Download Eryzaa</h1>
    
    <h2>Desktop Applications</h2>
    <div>
        <h3>Client App (For Using Resources)</h3>
        <a href="dist/linux/eryzaa-client">Linux x64</a> |
        <a href="dist/windows/eryzaa-client.exe">Windows x64</a> |
        <a href="dist/macos/eryzaa-client">macOS Universal</a>
    </div>
    
    <div>
        <h3>Rental App (For Sharing Your PC)</h3>
        <a href="dist/linux/eryzaa-rental">Linux x64</a> |
        <a href="dist/windows/eryzaa-rental.exe">Windows x64</a> |
        <a href="dist/macos/eryzaa-rental">macOS Universal</a>
    </div>
    
    <h2>Cross-Platform Launcher</h2>
    <a href="tools/launcher.py">Python Launcher</a>
</body>
</html>
```

## ✅ **Testing Checklist**

### **Basic Functionality**
- [ ] GUI applications start without errors
- [ ] Cross-platform builds succeed
- [ ] ZeroTier network connection works
- [ ] SSH connections establish successfully

### **Three Access Types**
- [ ] SSH access connects to shared PCs
- [ ] AI training starts and completes
- [ ] Edge computing deploys jobs to GPU nodes
- [ ] All interfaces are user-friendly

### **Blockchain Integration**
- [ ] Smart contracts deploy successfully
- [ ] AVAX payments work in testnet
- [ ] Escrow holds funds correctly
- [ ] Payment release works after job completion

### **Cross-Platform**
- [ ] Applications work on Linux
- [ ] Windows builds are created
- [ ] macOS builds are created (if on Mac)
- [ ] Python launcher detects platform correctly

### **User Experience**
- [ ] Setup is truly "one-click"
- [ ] Interface is intuitive and easy to use
- [ ] All three access types are clearly accessible
- [ ] Error handling is graceful

## 🎯 **Success Criteria**

Your Eryzaa platform is **fully working** when:

1. **Renters can easily share their PC** using the GUI rental app
2. **Clients can access all three types** of computing resources
3. **Payments work automatically** via AVAX smart contracts
4. **Everything works cross-platform** (Windows, macOS, Linux)
5. **Downloads are available** from a website or GitHub releases

## 🚀 **Ready for Production!**

Once all tests pass, your decentralized computing platform is ready to compete with Google Cloud and AWS! Users can:

- **Rent out their PCs** for passive income
- **Access computing resources** on-demand
- **Train AI models** like Google Colab
- **Run edge computing** workloads
- **Pay with AVAX** transparently

The platform provides a **complete ecosystem** for decentralized computing with professional-grade user experience!
