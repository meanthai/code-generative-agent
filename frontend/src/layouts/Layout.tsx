import Header from "@/components/Header";

type Props = {
    children: React.ReactNode;
}

const Layout = ({children}: Props) => {
    return (
        <div className="">
            <Header/>
            
            {children}
        </div>
    )
}

export default Layout;