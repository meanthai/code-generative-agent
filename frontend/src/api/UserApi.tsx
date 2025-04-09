import { useAuth0 } from "@auth0/auth0-react";
import { useMutation, useQuery } from "@tanstack/react-query";

type UserIdentifier = {
    auth0Id: string,
    email: string,
}

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


const VITE_API_BACKEND_TS_URL = import.meta.env.VITE_API_BACKEND_TS_URL;

export const createUserRequest = () => {
    const { getAccessTokenSilently } = useAuth0();

    const createUserFetch = async (userInfo: UserIdentifier) => {
        const accessToken = await getAccessTokenSilently();

        const response = await fetch(`${VITE_API_BACKEND_TS_URL}/api/my/user`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(userInfo), 
        });

        if(!response.ok){
            throw new Error("Error while creating users")
        }

        return response.json();
    }

    const mutation = useMutation({
        mutationFn: createUserFetch,
      });
      
      // Use `mutation.mutateAsync`
      const createUser = mutation.mutateAsync;
      
      // Correct way to check states
      const isLoading = mutation.isPending;
      const isError = mutation.isError;
      const isSuccess = mutation.isSuccess;
      
    return {
        createUser,
        isLoading,
        isError,
        isSuccess
    }
}

export const getUserRequest = () => {
    const { getAccessTokenSilently } = useAuth0();

    const getUserFetch = async (): Promise<UserInfo> => {
        const accessToken = await getAccessTokenSilently();

        const response = await fetch(`${VITE_API_BACKEND_TS_URL}/api/my/user`, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        if(!response.ok){
            throw new Error("Error while getting user's information!!!")
        }

        return response.json();
    }

    const { data: currentUser, error, isLoading } = useQuery({
        queryKey: ["userData"],
        queryFn: getUserFetch,
      });
      

    return { currentUser, isLoading } 
}

export const updateUserRequest = () => {
    const { getAccessTokenSilently } = useAuth0();

    const updateUserFetch = async (userInfo: UserInfo) => {
        const accessToken = await getAccessTokenSilently();

        const response = await fetch(`${VITE_API_BACKEND_TS_URL}/api/my/user`, {
            method: "PUT",
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(userInfo), 
        });

        if(!response.ok){
            throw new Error("Error while updating users")
        }

        return response.json();
    }

    const mutation = useMutation({
        mutationFn: updateUserFetch,
      });
      
      // Correct way to extract mutation function and states
      const updateUser = mutation.mutateAsync;
      const isLoading = mutation.isPending;  // `isPending` replaces `isLoading`
      const isError = mutation.isError;
      const isSuccess = mutation.isSuccess;
      
    return {
        updateUser,
        isLoading,
        isError,
        isSuccess
    }
}

