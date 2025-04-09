import { Link } from "react-router-dom"
import Login from "./Login"

const Header = () => {
    return (
        <div className="border-b-2 border-b-orange-500 py-6">
            <div className="container mx-auto flex justify-between items-center">
                <Link to="/" className="text-3xl font-bold tracking-tight text-orange-600">
                Fred Code-generative Agent
                </Link>
                
                <div className="hidden md:block">
                    <Login/>
                </div>
            </div>
        </div>
    )
} 

export default Header