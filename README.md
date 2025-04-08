
---

# 🎥 Presentation to Talking Avatar Web App

This project converts presentations into talking avatars using AI-powered audio and animation services. It consists of a **React + Vite frontend**, **Node.js backend**, and **multiple AI modules** running via Google Colab and tunneled using **ngrok**.

---

## 📁 Project Structure

```
root/
├── frontend/     → React (Vite)
├── backend/      → Node.js
├── .env          → Environment variables
```

---

## ⚙️ Prerequisites

- [Node.js](https://nodejs.org/)
- [npm](https://www.npmjs.com/)
- [LibreOffice](https://www.libreoffice.org/) (installed on your system)
- [ngrok](https://ngrok.com/)
- Google Colab account

---

## 🚀 Getting Started

### 🧩 Step 1: Set Up the Frontend

```bash
cd frontend
npm install
npm run dev
```

This will start the frontend on [http://localhost:5173](http://localhost:5173)

---

### 🧠 Step 2: Set Up the Backend

```bash
cd backend
npm install
```

Ensure the `.env` file is properly configured before running:

```bash
npm run dev
```

---

### 🛠️ Step 3: Install LibreOffice

- Download and install LibreOffice from: https://www.libreoffice.org/download/download/

- Add its path to the `.env` file:

```
PPT_TO_PDF_PATH="C:/Program Files/LibreOffice/program/soffice.exe"
```

---

## 🧪 AI Modules Setup on Google Colab

Each module must be run separately in different Colab notebooks.

### 🎤 1. Audio Generation (Google Colab)

- Run your **Audio Generation Colab** notebook.
- Tunnel using ngrok:

```bash
ngrok http 5000
```

- Update `.env`:

```
AUDIO_API_URL="https://8121-34-138-146-82.ngrok-free.app/generate-audio/"
```

---

### 💋 2. Wave2Lip (Google Colab)

- Run the **Wave2Lip Colab** notebook.
- Tunnel using ngrok:

```bash
ngrok http 5000
```

- Update `.env` (Note: Keep `/process` endpoint unchanged):

```
PROCESS_API_URL="https://625c-34-125-23-213.ngrok-free.app/process"
```

---

### 💃 3. Animation / Motion File (Google Colab)

- Run the **Motion Animation Colab** notebook.
- Tunnel using ngrok:

```bash
ngrok http 5000
```

- Update `.env`:

```
ANIMATION_API_URL="https://eb93-34-16-170-78.ngrok-free.app/animate"
```

---

### 🧠 4. RAG / RAGvwer File (Google Colab)

- Run the **RAGvwer Colab** notebook.
- Tunnel using ngrok:

```bash
ngrok http 5000
```

- Update `.env`:

```
FLASK_API_URL="https://1f31-34-125-88-152.ngrok-free.app"
```

---

## 🔐 .env File Example

```env
PPT_TO_PDF_PATH="C:/Program Files/LibreOffice/program/soffice.exe"
AUDIO_API_URL="https://8121-34-138-146-82.ngrok-free.app/generate-audio/"
ANIMATION_API_URL="https://eb93-34-16-170-78.ngrok-free.app/animate"
PROCESS_API_URL="https://625c-34-125-23-213.ngrok-free.app/process"
FLASK_API_URL="https://1f31-34-125-88-152.ngrok-free.app"
```

---

## ✅ Final Step: Run Everything

1. **Frontend**: `npm run dev` in `frontend/`
2. **Backend**: `npm run dev` in `backend/`
3. **Colab notebooks**: Run each one and tunnel with ngrok
4. **Enjoy your talking avatar magic!** 🎉

---

