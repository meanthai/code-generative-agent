import { useAuth0 } from "@auth0/auth0-react";
import { useState, useRef, useEffect } from "react";
import { Button } from "./ui/button";
import UsernameMenu from "./UserMenu";

const VITE_API_BACKEND_PY_URL = import.meta.env.VITE_API_BACKEND_PY_URL;

const Login = () => {
  const { loginWithRedirect, isAuthenticated } = useAuth0();
  const [cameraOn, setCameraOn] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const captureIntervalRef = useRef<number | null>(null);
  
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    setCameraOn(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          facingMode: "user"
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      // Start automatic capture every 500ms
      captureIntervalRef.current = window.setInterval(() => {
        captureImage();
      }, 500);
      
    } catch (err) {
      console.error("Error accessing camera:", err);
      setCameraOn(false);
    }
  };

  const stopCamera = () => {
    // Clear the capture interval
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
      captureIntervalRef.current = null;
    }
    
    // Stop all camera tracks
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraOn(false);
  };

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");
      
      // Set higher resolution
      const newWidth = 512;
      const newHeight = 512;
      canvas.width = newWidth;
      canvas.height = newHeight;

      
      if (context) {
        context.drawImage(videoRef.current, 0, 0, newWidth, newHeight);

        canvas.toBlob(async (blob) => {
          if (blob) {
            authenticateUserRequest(blob);
          };
        }, "image/png");    
      }
    }
  };

  const authenticateUserRequest = async (blob: Blob) => {
    console.log("Sending image to backend");
    
    try {
      const formData = new FormData();
      formData.append("image_file", blob, "capture.png");
      
      const response = await fetch(`${VITE_API_BACKEND_PY_URL}/api/verify_face`, {
        method: "POST",
        body: formData,
      });
      
      const data = await response.json();
      console.log("data: ", data);
      
      if (data.success) {
        console.log(data);
        console.log("User Verified:", data.metadata.user_name);
        stopCamera(); 

        await loginWithRedirect({
          appState: { returnTo: "/" },
          authorizationParams: { login_hint: data.metadata.user_email },
        });

        console.log("User authenticated");
        return true;

      } else {
        console.log("Face not recognized");
        return false;
      }
    } catch (error) {
      console.error("Error verifying face:", error);
    }
  };

  return (
    <>
      {isAuthenticated ? (
        <span className="flex space-x-2 items-center">
          <UsernameMenu />
        </span>
      ) : (
        <>
          {!cameraOn ? (
            <span className="flex space-x-2 items-center">
              <Button 
                variant="ghost" 
                className="font-bold hover:text-orange-500 hover:bg-white" 
                onClick={() => {console.log("login!"); loginWithRedirect()}}
              >
                Log In
              </Button>
              <Button 
                onClick={startCamera} 
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                Capture Face
              </Button>
            </span>
          ) : (
            <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center">
              <div className="bg-white p-6 rounded-lg max-w-lg w-full">
                <h3 className="text-xl font-bold mb-4">Facial Authentication Active</h3>
                <div className="relative mb-4">
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    className="w-full h-64 bg-gray-100 rounded-lg object-cover"
                  />
                  <canvas ref={canvasRef} className="hidden" width="512" height="512" />
                </div>
                <div className="flex justify-between">
                  <button
                    onClick={stopCamera}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    Cancel
                  </button>
                  <div className="text-sm text-gray-500 flex items-center">
                    <span className="relative flex h-3 w-3 mr-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                    </span>
                    Scanning...
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
};

export default Login;