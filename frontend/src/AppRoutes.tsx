import { Routes, Route, Navigate } from "react-router-dom"
import  MainChatbotPage  from "@/pages/MainChatbotPage"   
import Layout from "./layouts/Layout"
import AuthCallbackPage from "./pages/AuthCallbackPage"
import UserProfilePage from "./pages/UserProfilePage"

const AppRoutes = () => {
    return (
        <Routes>
            <Route path="/auth-callback" element={<AuthCallbackPage/>}/>

            <Route path="/user-profile" element={<Layout><UserProfilePage/></Layout>}/>

            <Route path="/" element={<Layout><MainChatbotPage /></Layout>} />

            <Route path="*" element={<Navigate to="/" />} />
        </Routes>
    )
}

export default AppRoutes