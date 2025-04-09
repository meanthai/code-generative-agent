from fastapi import FastAPI, File, UploadFile, HTTPException, Depends, Form, APIRouter, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import shutil
from dotenv import load_dotenv
import nest_asyncio
from pydantic import BaseModel
import os
from typing import List
from PIL import Image
import io
from qdrant_client import QdrantClient
from apscheduler.schedulers.background import BackgroundScheduler
from face_recognition_model import FaceRecognitionModel
from code_generative_agent import CodeGenerativeAgent

nest_asyncio.apply()
class InputPrompt(BaseModel):
    prompt: str
    user_id: str

class CodeOutput(BaseModel):
    answer: str
    code: str
    code_output_filename: str

class UserProfileImageInfo(BaseModel):
    user_id: str
    user_name: str
    user_email: str
    auth0_id: str

load_dotenv()

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

def remove_subdirs(directory: str = "data") -> None:
    if not os.path.exists(directory):
        print(f"Directory '{directory}' does not exist.")
        return

    for entry in os.scandir(directory):
        if entry.is_dir():
            shutil.rmtree(entry.path)
            print(f"Removed: {entry.path}")

@app.post("/api/agent/embed")
async def file_embedding(files: List[UploadFile] = File(...), user_id: str = Form(...)) -> dict:
    return await code_generative_agent.agent_file_embedding(files, user_id)

@app.post("/api/agent/response")
def get_response(input_prompt: InputPrompt) -> dict:
    return code_generative_agent.agent_response(input_prompt.prompt, input_prompt.user_id)

@app.post("/api/delete_facial_info_collection")
def delete_collection() -> dict:
    return face_recoginition_model.delete_existed_collection()

@app.post("/api/verify_face")
async def face_image_verifying(image_file: UploadFile = File(...)) -> dict:
    image = Image.open(io.BytesIO(await image_file.read()))

    if image.mode == "RGBA":
        image = image.convert("RGB")

    image.save("temp_image.jpg")

    print("successfully save the image")

    return face_recoginition_model.find_face("temp_image.jpg")

@app.post("/api/register_face")
async def face_image_verifying(user_id: str = Form(...), user_name: str = Form(...), user_email: str = Form(...), auth0_id: str = Form(...), image_file: UploadFile = File(...)) -> dict:
    try:
        image = Image.open(io.BytesIO(await image_file.read()))

        if image.mode == "RGBA":
            image = image.convert("RGB")

        image.save("temp_image.jpg")

        user_identity_profile = UserProfileImageInfo(user_id=user_id, user_name=user_name, user_email=user_email, auth0_id=auth0_id)

        face_recoginition_model.embed_face("temp_image.jpg", user_identity_profile)

        return {
            "success": True,
            "response": "Face registered successfully"
        }

    except Exception as e:
        print("Error: ", e)
        return {
            "success": False,
            "repsonse": str(e)
        }

if __name__ == "__main__":
    remove_subdirs("data")
    remove_subdirs("results")

    qdrant_client = QdrantClient(url='qdrant_all:6333')

    code_generative_agent = CodeGenerativeAgent(qdrant_client=qdrant_client)

    face_recoginition_model = FaceRecognitionModel(qdrant_client=qdrant_client)

    scheduler = BackgroundScheduler()
    scheduler.add_job(code_generative_agent.delete_inactive_users, "interval", minutes=10)  # Check every 10 minutes
    scheduler.start()

    print("successfully initialize everything!")
    try:
        uvicorn.run(app, host="0.0.0.0", port=8053, loop="asyncio")
        print("successfully initialize the fastapi application")
    except Exception as e:
        print("Errors with the fastapi app initialization: ", e)
