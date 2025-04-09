import { toast } from "sonner";

const VITE_API_BACKEND_PY_URL = import.meta.env.VITE_API_BACKEND_PY_URL;

type FileEmbedResponse = {
    response: string;
}

type PromptData = {
    prompt: string;
    user_id: string;
}

type ChatbotResponse = {
    response: string;
}

type UploadedFile = {
    file: FileList;
    user_id: string;
}

export const FileEmbedRequest =  async (uploadedFile: UploadedFile): Promise<FileEmbedResponse> => {
    const formData = new FormData(); 

    Array.from(uploadedFile.file).forEach((file) => {
        formData.append("files", file); 
    });    
    formData.append("user_id", uploadedFile.user_id);

    console.log("formData before sending: ", formData)

    const response = await fetch(`${VITE_API_BACKEND_PY_URL}/api/agent/embed`, {
        method: "POST",
        body: formData,
    });

    if(!response.ok){
        throw new Error("Error while embedding the documents from file!");
    }

    const data = await response.json();
    
    return data as FileEmbedResponse;
}

export const ChatbotPromptRequest  = async (promptData: PromptData): Promise<ChatbotResponse> => {

    const response = await fetch(`${VITE_API_BACKEND_PY_URL}/api/agent/response`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json", 
        },
        body: JSON.stringify(promptData),
    });

    if(!response.ok){
        throw new Error("Error while fetching prompt data!");
    }

    const data = await response.json();

    console.log("data from backend: ", data);
    
    if (data.code_output_filename.trim()) {
        toast.success(`New code file generated: ${data.code_output_filename}`);
    }

    return data as ChatbotResponse;
}