from llama_index.vector_stores.qdrant import QdrantVectorStore
from llama_index.embeddings.huggingface import HuggingFaceEmbedding
from llama_index.llms.gemini import Gemini
from llama_index.core.tools import QueryEngineTool, ToolMetadata
from llama_index.core.agent import ReActAgent
from llama_index.vector_stores.qdrant import QdrantVectorStore
from llama_index.core import VectorStoreIndex, SimpleDirectoryReader
from llama_index.core.node_parser import TokenTextSplitter
from typing import List
from fastapi import UploadFile
import os
from llama_index.core import VectorStoreIndex, Settings, StorageContext
from llama_index.vector_stores.qdrant import QdrantVectorStore
from llama_index.core import VectorStoreIndex, SimpleDirectoryReader, StorageContext
from llama_parse import LlamaParse
from llama_index.core.tools import FunctionTool
from llama_index.core.storage.docstore.simple_docstore import (
    SimpleDocumentStore,
)
from llama_index.core.extractors import DocumentContextExtractor
import time 

updated_code_output_filename = ""

def code_reader_func(code_dir_list: List[str]):
    "This function receives inputs as a list of code directories of files to read their contents and returns the content of the files"
    content = ""
    try:
        for file_name in code_dir_list:
            path = os.path.join("data", file_name)

            with open(path, "r") as f:
                content += f.read() + ("=" * 100) + "\n"

        return {"file_content": content}
    except Exception as e:
        return {"error": str(e)}

def code_save_func(code_output_filename, code_content):
    global updated_code_output_filename
    "This function receives the structured output from the code parser and saves the code to a file"
    try:
        saved_result_path = os.path.join("results", code_output_filename)
        os.makedirs(os.path.dirname(saved_result_path), exist_ok=True)

        with open(saved_result_path, "w") as f:
            f.write(code_content)

        updated_code_output_filename = code_output_filename
    except Exception as e:
        return {"error": str(e)}

class CodeGenerativeAgent:
    def __init__(self, qdrant_client):
        try:
            self.llm = Gemini(
                model="models/gemini-2.0-flash",
                api_key=os.getenv("GEMINI_API_KEY"),
            )

            Settings.llm = self.llm

            self.embed_model = HuggingFaceEmbedding(model_name="BAAI/bge-m3", cache_folder="/myProject/.cache")

            Settings.embed_model = self.embed_model

            self.qdrant_client = qdrant_client

            self.query_engine = {}
            self.agent = {}
            self.given_docs_file_name = {}
            self.last_activity = {}
            self.EXPIRATION_TIME = 7200

            self.file_extractor = {".pdf": LlamaParse(result_type="markdown")}

            self.text_splitter = TokenTextSplitter(
                separator=" ", chunk_size=1024, chunk_overlap=30
            )

            self.code_reader = FunctionTool.from_defaults(
                fn=code_reader_func,
                name="code_reader",
                description="""this tool can read the contents of code files to get more information and return 
                their results. Use this when you need to read the contents of a code file""",
            )

            self.code_writer = FunctionTool.from_defaults(
                fn=code_save_func,
                name="code_writer",
                description="This tool can help save a code program to a file by receiving code content and write or save the code to a file given file name. Use this when the user ask to generate a code program"
            )

            self.agent_context = """You are a helpful code generative assistant. Your primary role is to assist users by analyzing and generating code based on the provided docs and user's queries:
        - First, you should use the given documents (code files and text files) and given tools (use code_reader to read codes by giving the file names, documentation_for_code query engine to get documentation of the code by giving queries about the parts you want to know), and if the docs are irrelevant or not helpful, do not use them and answer the question yourself.
        - Remember to use the code_writer tool to save the code to a file if users ask for generating a code program
        - Your output response should be the description on how to use the code (installation and running instructions)"""

        except Exception as e:
            print("Error: ", e)
            raise e

    def create_vector_store_index_query_engine(self, user_id) -> None:
        try:
            documents = SimpleDirectoryReader(os.path.join("data", user_id), file_extractor=self.file_extractor).load_data()
        
            vector_store = QdrantVectorStore(client=self.qdrant_client, collection_name=user_id)

            storage_context = StorageContext.from_defaults(vector_store=vector_store)

            docstore = SimpleDocumentStore()

            context_extractor = DocumentContextExtractor(
                docstore=docstore,
                max_context_length=128000, 
                oversized_document_strategy="warn",
                max_output_tokens=512,
                llm=self.llm,
                key=user_id,
                prompt=DocumentContextExtractor.SUCCINCT_CONTEXT_PROMPT,
            )

            index = VectorStoreIndex.from_documents(
                documents,
                storage_context=storage_context,
                transformations=[self.text_splitter, context_extractor]
            )

            del documents
            del vector_store
            del storage_context
            del context_extractor
            del docstore

            self.query_engine[user_id] = index.as_query_engine(llm=self.llm, text_splitter=self.text_splitter)

            print("successfully create the query engine!")
        except Exception as e:
            print("Error from create_vector_store_index_query_engine: ", e)
            raise e

    def create_agent_with_tools(self, user_id) -> dict:
        if user_id in self.agent:
            return {
                "response": "Agent already existed"
            }

        if user_id not in self.query_engine:
            print("Query engine not found for the user")
            return {
                "response": "Query engine not found for the user"
            }

        try:

            tools = [
                QueryEngineTool(
                    query_engine=self.query_engine[user_id],
                    metadata=ToolMetadata(
                        name="documentation_for_code",
                        description="This tool provides documentation for code, use this for getting any documentation for code to be more informative. To use this, you need to provide one query that contains many parts you want to know about the documentation for the code",
                    )
                ),
                self.code_reader,
                self.code_writer
            ]

            self.agent[user_id] = ReActAgent.from_tools(tools=tools, llm=self.llm, verbose=True, context=self.agent_context)

            print("successfully create the agent!")

            return {
                "response": "Agent created successfully"
            }
        
        except Exception as e:
            return {
                "error": str(e)
            }

    async def agent_file_embedding(self, files: List[UploadFile], user_id: str) -> dict:
        try:
            if user_id not in self.given_docs_file_name:
                self.given_docs_file_name[user_id] = []
            
            self.last_activity[user_id] = time.time()

            for file in files:
                file_path = os.path.join("data", user_id, file.filename)
                os.makedirs(os.path.dirname(file_path), exist_ok=True)

                self.given_docs_file_name[user_id].append(os.path.join(user_id, file.filename))

                with open(file_path, "wb") as f:
                    content = await file.read()
                    f.write(content)
            
            self.create_vector_store_index_query_engine(user_id=user_id)
            self.create_agent_with_tools(user_id=user_id)

            return {
                "response": "Files uploaded successfully"
            }
        except Exception as e:
            return {
                "error": str(e)
            }

    def agent_response(self, input_prompt: str, user_id: str) -> dict:
        global updated_code_output_filename
        try: 
            self.last_activity[user_id] = time.time()

            final_prompt = (f"Based on these documents: {' '.join(self.given_docs_file_name[user_id])}. " if self.given_docs_file_name[user_id] else "") + f"Here is the user's prompt: {input_prompt}. Decide on your own to use code_reader tool for code files and documentation_for_code tools by giving one query containing many parts about documentation of the code to get more information. If the documents are irrelevant or not helpful, answer the question yourself. Remember if the user ask you to generate code, you have to save it to a file using code_writer tool, and answer the user with usage instructions"

            response = self.agent[user_id].chat(final_prompt)

            print("response from agent: ", response.response)

            current_code_output_filename = updated_code_output_filename if updated_code_output_filename else ""
            updated_code_output_filename = ""

            return {
                "response": response.response,
                "code_output_filename": current_code_output_filename
            }
        except Exception as e:
            return {
                "error": str(e)
            }
        
    def delete_inactive_users(self) -> None:
        try:
            current_time = time.time()

            inactive_users = [user_id for user_id, last_active_time in self.last_activity.items() if current_time - last_active_time > self.EXPIRATION_TIME]

            for user_id in inactive_users:
                del self.query_engine[user_id]
                del self.agent[user_id]
                del self.given_docs_file_name[user_id]
        except Exception as e:
            print("Error from delete_inactive_users: ", e)
            raise e
