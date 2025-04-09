from deepface import DeepFace
import numpy as np
from qdrant_client.models import Distance, VectorParams
from fastapi import FastAPI, File, UploadFile
from pydantic import BaseModel
from PIL import Image
import io
from qdrant_client import models
from uuid import uuid4  

class UserProfileImageInfo(BaseModel):
    user_id: str
    user_name: str
    user_email: str
    auth0_id: str

class FaceRecognitionModel:
    def __init__(self, qdrant_client):
        self.model_name = "Facenet512"
        self.qdrant_client = qdrant_client

    def create_qdrant_vector_db_collection(self, collection_name, dim=512) -> dict:
        try:
            if self.qdrant_client.collection_exists(collection_name):
                print("collection existed!!!")
                return {"exist": 1}
            
            self.qdrant_client.create_collection(
                collection_name=collection_name,
                vectors_config=VectorParams(size=dim, distance=Distance.COSINE),
            )

            print("new collection created!")

            return {"exist": 0}

        except Exception as e:
            print(e)

    def embed_face(self, img_path: str, user_metadata_info: UserProfileImageInfo, collection_name="user_identity_image") -> None:
        try:
            if not self.qdrant_client.collection_exists(collection_name):
                self.create_qdrant_vector_db_collection(collection_name=collection_name)
        
            embedding = DeepFace.represent(img_path=img_path, model_name = self.model_name, enforce_detection=False)[0]['embedding']

            unique_id = str(uuid4())

            self.qdrant_client.upsert(
                collection_name=collection_name,
                points=[
                    models.PointStruct(
                        id=unique_id,
                        payload={
                            "user_id": user_metadata_info.user_id, 
                            "user_name": user_metadata_info.user_name, 
                            "user_email": user_metadata_info.user_email,
                            "auth0_id": user_metadata_info.auth0_id
                        },  
                        vector=embedding
                    )
                ],
            )

            return None

        except Exception as e:
            print(e)
            return None
    
    def find_face(self, img_path: str, collection_name="user_identity_image") -> dict:
        try:
            embedding = DeepFace.represent(img_path=img_path, model_name = self.model_name, enforce_detection=False)[0]['embedding']

            search_result = self.qdrant_client.query_points(
                collection_name=collection_name,
                query=embedding,
                query_filter=None,
                limit=1,
            ).points

            return {
                "success": True,
                "metadata": search_result[0].payload
            }

        except Exception as e:
            print(e)
            return {
                "success": False,
            }
        
    def delete_existed_collection(self, collection_name="user_identity_image") -> dict:
        try: 
            if self.qdrant_client.collection_exists(collection_name):
                self.qdrant_client.delete_collection(collection_name = collection_name)

                return {"response": "delete successfully!"}
            else:
                return {"response": "collection name not existed!"}

        except Exception as e:
            print(e)
            return {"error": e}

