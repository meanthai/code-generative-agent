
import React, { useRef, useState } from 'react';
import { Send, Upload, Loader2, User } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { useEffect } from 'react';
import { FileEmbedRequest, ChatbotPromptRequest } from '@/api/ChatbotApi';
import chatbotIcon from "@/assets/chatbot.png";
import { Separator } from '@/components/ui/separator';
import { useAuth0 } from '@auth0/auth0-react';
import { getUserRequest, updateUserRequest } from '@/api/UserApi';

type UploadedFile = {
    file: FileList;
    user_id: string;
}

type PromptData = {
    prompt: string;
    user_id: string;
}

const messageHistory = [
    { role: "assistant", content: "Hi! How can I assist you today?", timeStamp: new Date()},
];

type FileReference = {
    filename: string;
    contentType: string;
    size: number;
    uploadDate: Date;  // Optional, as it defaults to Date.now in Mongoose
};

type UserInfo = {
    _id: string;
    auth0Id: string;
    email: string;
    name: string;
    phoneNumber: string;
    hasFacialAuth: boolean;
    files: FileReference[]; // Updated from `any[]` to proper type
};

let uploadedFileList: FileReference[] = [];

const MainChatbotPage = () => {
    const { isAuthenticated } = useAuth0();

    const { currentUser } = getUserRequest();

    const { updateUser, isLoading } = updateUserRequest();

    const [messages, setMessages] = useState(messageHistory);
    const [inputMessage, setInputMessage] = useState('');
    const [uploading, setUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState<FileList | undefined>(undefined);
    const [uploadedFileHistory, setUploadedFileHistory] = useState(uploadedFileList)

    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom 
    useEffect(() => {
        if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    useEffect(() => {
        if (selectedFile) {
            console.log("Updated selected file:", selectedFile);
        }
    }, [selectedFile]);

    useEffect(() => {
        if (currentUser?.files) {
            setUploadedFileHistory(currentUser.files);
        }
    }, [currentUser]);

    
    const reformatResponse = (response: string) => {
        return response
            .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") // Bold
            .replace(/```bash\n([\s\S]*?)```/g, `<pre><code class="language-bash">$1</code></pre>`) // Bash code block
            .replace(/```python\n([\s\S]*?)```/g, `<pre><code class="language-python">$1</code></pre>`) // Python code block
            .replace(/```([\s\S]*?)```/g, `<pre><code>$1</code></pre>`) // Generic code block
            .replace(/\n{2,}/g, "<br><br>") // Preserve double new lines for paragraph spacing
            .replace(/\n/g, " "); // Remove single new lines to avoid unnecessary line breaks
    };

    const handleSendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!inputMessage.trim()) return;

        const userMessage = { role: 'user', content: inputMessage, timeStamp: new Date() }

        setMessages((messages) => [...messages, userMessage]);

        const PromptInput: PromptData = {
            prompt: inputMessage,
            user_id: currentUser?._id as string,
        }

        setInputMessage('');

        const waitingResponse = { role: 'assistant', content: "Generating response...", timeStamp: new Date() }
        
        setMessages((messages) => [...messages, waitingResponse]);

        const chatbotResponse = await ChatbotPromptRequest(PromptInput);

        console.log("agent response: ", chatbotResponse.response)

        const chatbotMessage = { role: 'assistant', content: reformatResponse(chatbotResponse.response), timeStamp: new Date() }

        setMessages(messages => 
            messages.map((message, index) =>
                index === messages.length - 1 // Replace the last (placeholder) message
                    ? chatbotMessage
                    : message
            )
        );
    };  

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return; // Ensure given file exists

        const files = e.target.files;

        setSelectedFile(files);

        console.log("file uploaded: ", files);
        console.log("selected file: ", selectedFile);
    };


    const handleEmbeddingFile = async () => {
        if (!selectedFile) {
            console.log("no file found!");
            return;
        }
        console.log("embedding file!");

        let uploadedFileRefList = [];

        for (let file of selectedFile) {
            const uploadedFileRef: FileReference = {
                filename: file.name,
                contentType: file.type,
                size: file.size,
                uploadDate: new Date(),
            }
            uploadedFileRefList.push(uploadedFileRef)
        }

        let updatedFiles = currentUser?.files || [];        

        for (const uploadedFileRef of uploadedFileRefList){
            let existed = false;

            for(const file of updatedFiles){
                if(file.filename === uploadedFileRef.filename){
                    existed = true;
                    break;
                }
            }

            if (!existed){
                updatedFiles = [...(currentUser?.files || []), uploadedFileRef];
            }
        }

        console.log("updated files: ", updatedFiles);
    
        setUploadedFileHistory(updatedFiles);

        const newUser: UserInfo = {
            _id: currentUser?._id as string,
            auth0Id: currentUser?.auth0Id as string,
            email: currentUser?.email as string,
            name: currentUser?.name as string,
            phoneNumber: currentUser?.phoneNumber as string,
            hasFacialAuth: currentUser?.hasFacialAuth as boolean,
            files: updatedFiles, 
        };

        console.log("new user: ", newUser);

        await updateUser(newUser);

        const uploadedFile: UploadedFile = {
            file: selectedFile,
            user_id: currentUser?._id as string,
        };

        setUploading(true);

        const response = await FileEmbedRequest(uploadedFile);

        setUploading(false);
    }

    if (isLoading) {
        return (
          <div className="flex justify-center items-center h-64">
            <div className="text-xl font-semibold">Loading profile...</div>
          </div>
        );
    }

    return (
        <div className="flex h-[90vh] max-w-7xl mx-auto p-4 gap-4">
        {/* Document Upload Section */}
            <Card className="w-1/3">
                <CardHeader className='flex items-center text-orange-600'>
                    <CardTitle>Upload Documents</CardTitle>
                </CardHeader> 

                <Separator/>

                <CardContent className='p-3'>
                    <div className="space-y-4">
                        <div className="grid w-full items-center gap-3">
                            <Label htmlFor="document">Document</Label>

                            <div className="grid gap-2">
                                <Input
                                    id="document"
                                    type="file"
                                    multiple
                                    className="cursor-pointer"
                                    onChange={handleFileUpload}
                                    disabled={uploading || !isAuthenticated}
                                />

                                <Button onClick={handleEmbeddingFile} disabled={uploading || !isAuthenticated}>
                                    {
                                        uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Processing"
                                    }
                                </Button>

                                <Separator className='pt-1'/>

                                {
                                    isAuthenticated ? (<>
                                        <div className='flex flex-col items-center text-orange-600'><p>Uploaded Document History</p></div>

                                        <ScrollArea className="pt-4 max-h-120 border border-gray-300 rounded-lg p-2">
                                            <div className="space-y-2">
                                                {uploadedFileHistory.map((file, index) => (
                                                    <div key={index} className="flex items-center gap-2 p-2 bg-gray-100 rounded-md shadow-sm">
                                                        <Upload className="h-5 w-5 text-orange-500" />
                                                        <p className="text-sm font-medium">{file.filename}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </ScrollArea>
                                    </>) : (
                                        <></>
                                    )
                                }
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

        {/* Chat Interface Section */}
            <Card className="w-2/3 flex flex-col">
                <CardHeader className='flex items-center text-orange-600'>
                    <CardTitle>Fred Code-generative Agent</CardTitle>
                </CardHeader>

                <Separator/>

                <CardContent className="flex-1 h-[600px] flex flex-col p-3">
                    <ScrollArea className="flex-1  pr-4">
                        <div className="space-y-4 pb-1">
                            {isAuthenticated ? (messages.map((message, index) => (
                                <div
                                    key={index}
                                    className={`flex items-start gap-2 ${
                                        message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                                    }`}
                                >
                                    {/* Icon container */}
                                    <div className="flex-shrink-0">
                                        {message.role === 'user' ? (
                                            <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center">
                                                <User className="h-5 w-5 text-white" />
                                            </div>
                                        ) : (
                                            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                                                <img 
                                                    src={chatbotIcon} 
                                                    alt="Chatbot" 
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {/* Message bubble */}
                                    <div
                                            className={`rounded-lg px-4 py-2 max-w-[80%] ${
                                                message.role === 'user'
                                                    ? 'bg-orange-500 text-white'
                                                    : 'bg-gray-100'
                                            }`}
                                        >
                                            {message.content}
                                    </div>
                                </div>
                            ))) : (<div className="flex justify-center items-center h-full">
                                <p className="text-gray-500">Please login to use the Fred Code-generative Agent service!</p>
                            </div>)}
                            <div ref={messagesEndRef} />
                        </div>
                    </ScrollArea>

                    <form onSubmit={handleSendMessage} className="mt-4 flex gap-2">
                        <Input
                            value={inputMessage}
                            onChange={(e) => setInputMessage(e.target.value)}
                            placeholder="Type your message..."
                            className="flex-1"
                            disabled={!isAuthenticated}
                        />
                        
                        <Button type="submit" size="icon" disabled={!isAuthenticated}>
                            <Send className="h-4 w-4" />
                        </Button>
                    </form>

                </CardContent>
            </Card>
        </div>
    );
};

export default MainChatbotPage;




