import React, { useState } from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

const DashboardLayout = ({ children }) => {

    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-200">
      
            <Navbar toggleSidebar={toggleSidebar} isDashboard={true} />


            <div className="pt-16">

                <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

  
              <main className="transition-all duration-300 ml-0 lg:ml-64 min-h-[calc(100vh-4rem)] p-4 sm:p-6 lg:p-8 overflow-x-hidden">
                    <div className="max-w-7xl mx-auto animate-fade-in">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;
