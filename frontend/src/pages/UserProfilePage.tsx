import React, { useState, useEffect, useRef } from 'react';
import { getUserRequest, updateUserRequest } from "@/api/UserApi";
import { useAuth0 } from '@auth0/auth0-react';

type UserInfo = {
  _id: string;
  auth0Id: string;
  email: string;
  name: string;
  phoneNumber: string;
  hasFacialAuth: boolean;
  files: {
    filename: string;
    contentType: string;
    size: number;
    uploadDate: Date;
  }[];
};

const VITE_API_BACKEND_PY_URL = import.meta.env.VITE_API_BACKEND_PY_URL;

const UserProfilePage: React.FC = () => {
  const { currentUser: originalCurrentUser, isLoading } = getUserRequest();
  const { updateUser, isLoading: isUpdating, isSuccess, isError } = updateUserRequest();
  const { user } = useAuth0();

  useEffect(() => {
    if (originalCurrentUser) {
      setCurrentUser(originalCurrentUser);
    }
  }, [originalCurrentUser]);
  
  const [formData, setFormData] = useState<Partial<UserInfo>>({
    name: '',
    email: '',
    phoneNumber: '',
    hasFacialAuth: false,
  });
  
  const [isEditing, setIsEditing] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const [currentUser, setCurrentUser] = useState<Partial<UserInfo>>(originalCurrentUser as UserInfo);
  
  // New state for face capture
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [facialAuthStatus, setFacialAuthStatus] = useState<boolean | undefined>(
    originalCurrentUser?.hasFacialAuth
  );
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (currentUser) {
      setFacialAuthStatus(currentUser.hasFacialAuth);
      setFormData({
        name: currentUser.name || '',
        email: currentUser.email || '',
        phoneNumber: currentUser.phoneNumber || '',
        hasFacialAuth: currentUser.hasFacialAuth || false,
      });
    }
  }, [currentUser]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const updateData = {
        _id: currentUser?._id || '',
        auth0Id: currentUser?.auth0Id || user?.sub || '',
        email: formData.email || '',
        name: formData.name || '',
        phoneNumber: formData.phoneNumber || '',
        hasFacialAuth: facialAuthStatus || false,
        files: currentUser?.files || []
      };
      
      await updateUser(updateData);

      setSubmitMessage('Profile updated successfully!');

      setIsEditing(false);

      setCurrentUser({
        ...currentUser,
        name: updateData.name || '',
        email: updateData.email || '',
        phoneNumber: updateData.phoneNumber || '',
        hasFacialAuth: updateData.hasFacialAuth
      })

      setTimeout(() => setSubmitMessage(''), 1000);

    } catch (error) {
      setSubmitMessage('fail to update profile, please try again.');
      console.error('error updating profile:', error);
    }
  };

  // Face capture functions
  const startCamera = async () => {
    setIsCameraOn(true);
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
    } catch (err) {
      console.error("Error accessing camera:", err);
      setIsCameraOn(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraOn(false);
  };

  const sendImageToBackend = async (blob: Blob) => {
    console.log("Sending image to backend");
    const formData = new FormData();
    formData.append("image_file", blob, "capture.png");
    formData.append("user_name", currentUser?.name || '');
    formData.append("user_id", currentUser?._id || '');
    formData.append("user_email", currentUser?.email || '');
    formData.append("auth0_id", currentUser?.auth0Id || '');

    try {
      const response = await fetch(`${VITE_API_BACKEND_PY_URL}/api/register_face`, {
        method: "POST",
        body: formData,
      });
      
      const data = await response.json();
      console.log("data: ", data);
      
      if (data.success) {
        const updateData = {
          _id: currentUser?._id || '',
          auth0Id: currentUser?.auth0Id || user?.sub || '',
          email: currentUser?.email || '',
          name: currentUser?.name || '',
          phoneNumber: currentUser?.phoneNumber || '',
          hasFacialAuth: true,
          files: currentUser?.files || []
        };
        
        await updateUser(updateData);

        stopCamera(); 
      } else {
        console.log("Face not recognized");
      }
    } catch (error) {
      console.error("Error verifying face:", error);
    }
  };

  const captureFace = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      canvas.width = 512;
      canvas.height = 512;
      
      if (context) {
        context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        
        canvas.toBlob((blob) => {
          if (blob) sendImageToBackend(blob);
        }, "image/png");

        setFacialAuthStatus(true);
        }
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-xl font-semibold">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">User Profile</h1>
      
      {submitMessage && (
        <div className={`p-4 mb-4 rounded ${isSuccess ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {submitMessage}
        </div>
      )}

      <div className="bg-white shadow-md rounded-lg p-6">
        {!isEditing ? (
          // View mode
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold mb-4">Personal Information</h2>

              <div className="border-t border-gray-200 pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-500 text-sm">Name</p>
                    <p className="font-medium">{currentUser?.name || 'Not provided'}</p>
                  </div>

                  <div>
                    <p className="text-gray-500 text-sm">Email</p>
                    <p className="font-medium">{currentUser?.email || 'Not provided'}</p>
                  </div>

                  <div>
                    <p className="text-gray-500 text-sm">Phone Number</p>
                    <p className="font-medium">{currentUser?.phoneNumber || 'Not provided'}</p>
                  </div>

                  <div>
                    <p className="text-gray-500 text-sm">Auth0 ID</p>
                    <p className="font-medium truncate">{currentUser?.auth0Id || 'Not available'}</p>
                  </div>
                  
                  {/* New field for facial authentication status */}
                  <div>
                    <p className="text-gray-500 text-sm">Facial Authentication</p>
                    <p className="font-medium">
                      {facialAuthStatus ? 
                        <span className="text-green-600">Enabled</span> : 
                        <span className="text-red-600">Not Set Up</span>
                      }
                    </p>
                  </div>
                </div>
              </div>
              
            </div>

            <div className="mt-6 flex gap-2">
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Edit Profile
              </button>
              
              {/* New button for face capture */}
              <button
                onClick={startCamera}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                Setup Facial Authentication
              </button>
            </div>
          </div>
        ) : (
          // Edit mode
          <form onSubmit={handleSubmit} className="space-y-4">
            <h2 className="text-xl font-semibold mb-4">Edit Profile</h2>
            
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>

                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>

                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>

                <input
                  type="tel"
                  id="phoneNumber"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-4 pt-4">
              <button
                type="submit"
                disabled={isUpdating}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-blue-300"
              >
                {isUpdating ? 'Saving...' : 'Save Changes'}
              </button>
              
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
      
      {/* Camera overlay */}
      {isCameraOn && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg max-w-lg w-full">
            <h3 className="text-xl font-bold mb-4">Capture Your Face</h3>
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
              <button
                onClick={captureFace}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                Capture
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfilePage;