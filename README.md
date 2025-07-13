## 📋 Table of Contents

- [Features Implemented](#features-implemented)
- [Technologies Used](#technologies-used)
- [Setup Instructions](#setup-instructions)
- [Optional Features Attempted](#optional-features-attempted)
- [Project Structure](#project-structure)

## ✨ Features Implemented

### 🎯 **Step 1: Project Creation & Template Upload**
- ✅ **Project Form**: Create projects with name, description, issuer, and issue date
- ✅ **PDF Template Upload**: Upload certificate templates with drag-and-drop support
- ✅ **PDF Viewer**: Display uploaded PDFs using react-pdf
- ✅ **QR Code Positioning**: Click on PDF to record QR code coordinates (X, Y)
- ✅ **Form Validation**: Client-side and server-side validation
- ✅ **Progress Tracking**: Step-wise indicator with completion status

### 📦 **Step 2: Batch File Upload & Validation**
- ✅ **ZIP File Upload**: Upload batches containing PDFs + Excel mapping
- ✅ **File Validation**: Comprehensive validation of ZIP contents
- ✅ **Excel Parsing**: Parse certificate mapping with flexible column detection
- ✅ **Validation Summary**: Display total entries, valid/invalid records
- ✅ **Batch Breakdown**: Automatic splitting into processing batches (configurable size)
- ✅ **Error Reporting**: Detailed validation error messages
- ✅ **Processing Time Estimation**: Calculate estimated processing time
- ✅ **File Size Limits**: Configurable limits (10MB PDF, 100MB ZIP, 250 certificates max)

### 🚀 **Step 3: Issuance Dashboard & Real-time Processing**
- ✅ **Real-time Dashboard**: Live updates using WebSockets
- ✅ **Certificate Table**: Status tracking (Pending, In Progress, Issued, Failed)
- ✅ **Batch Processing**: Start/stop batch issuance with progress tracking
- ✅ **Action Buttons**: Retry, Reissue, View Certificate, Verification links
- ✅ **PDF Viewer Modal**: Preview certificates with zoom controls
- ✅ **QR Code Generation**: Embed unique QR codes in certificates
- ✅ **Bulk Operations**: Bulk retry/reissue failed certificates
- ✅ **Download Options**: Download individual certificates or batch ZIP
- ✅ **Progress Indicators**: Real-time progress bars and statistics

### 🔧 **Additional Features**
- ✅ **Project Management**: Edit, delete, and manage multiple projects
- ✅ **Responsive Design**: Mobile-friendly interface with dark theme
- ✅ **Error Handling**: Comprehensive error handling and user feedback
- ✅ **File Management**: Organized file storage with project separation
- ✅ **Search & Filter**: Find projects and certificates easily
- ✅ **Certificate Verification**: External verification portal links

## 🛠 Technologies Used

### **Frontend**
- **React**
- **TypeScript**
- **React Router**
- **React PDF**
- **Axios**
- **Socket.IO Client**
- **Lucide React**

### **Backend**
- **Node.js**
- **Express.js**
- **TypeScript**
- **MongoDB + Mongoose**
- **Socket.IO**
- **Multer**
- **PDF-lib**
- **QRCode**
- **XLSX**
- **AdmZip**
- **Archiver**

## 📚 Setup Instructions

### **Prerequisites**
- Node.js 16+ and npm
- MongoDB (local or cloud instance)
- Git

### **1. Clone the Repository**
```bash
git clone https://github.com/shresthasriv/dynamic-cert-issuance.git
```

### **2. Backend Setup**
```bash
cd backend

# Install dependencies
npm install

# Create environment file

# Configure environment variables in .env:
MONGODB_URI=your_mongodb_connection_string

# Build TypeScript
npm run build

# Start development server
npm run dev
```

### **3. Frontend Setup**
```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm start
```


### **5. Access the Application**
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000/api
- **Health Check**: http://localhost:5000/api/health

## 🎯 Optional Features Attempted

### ✅ **Implemented Optional Features**
1. **MongoDB Persistence** - Full data persistence with Mongoose ODM
2. **Real-time WebSocket Updates** - Live certificate processing updates
3. **Comprehensive File Management** - Organized file storage and cleanup
4. **Advanced PDF Processing** - QR code embedding with precise positioning
5. **Bulk Operations** - Batch retry/reissue functionality
6. **Download System** - Individual and bulk certificate downloads

## 📁 Project Structure

```
AI-CERTs/
├── frontend/                 # React TypeScript frontend
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── services/        # API and WebSocket services
│   │   ├── types/          # TypeScript type definitions
│   │   └── App.css         # Global styles
│   └── public/             # Static assets
├── backend/                 # Node.js TypeScript backend
│   ├── src/
│   │   ├── models/         # MongoDB models
│   │   ├── routes/         # Express routes
│   │   ├── services/       # Business logic services
│   │   ├── config/         # Database configuration
│   │   └── types/          # TypeScript interfaces
│   └── dist/               # Compiled JavaScript
├── uploads/                # File storage (development)
└── README.md              # This file
```