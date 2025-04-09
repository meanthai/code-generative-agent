import { createUserRequest } from "@/api/UserApi";
import { useAuth0 } from "@auth0/auth0-react"
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

const AuthCallbackPage = () => {
    const navigate = useNavigate();
    const { user } = useAuth0();

    const {createUser, isLoading, isError, isSuccess } = createUserRequest();

    const hasCreatedUser = useRef(false);

    console.log("hasCreatedUser: ", hasCreatedUser.current);
    
    useEffect(() => {
        if (user?.sub && user?.email && !hasCreatedUser.current){
            console.log("create user from auth callback page!");
            createUser({
                auth0Id: user.sub,
                email: user.email,
            });
            hasCreatedUser.current = true;
        }
        navigate("/");
    }, []);

    return <div>Loading...</div>
}

export default AuthCallbackPage;