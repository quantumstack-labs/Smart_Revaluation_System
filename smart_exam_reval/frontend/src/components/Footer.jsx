import React from 'react';
import { GraduationCap, Github, Twitter, Linkedin, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';

const Footer = () => {
    return (
        <footer className="bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 py-12 border-t border-slate-200 dark:border-slate-800 transition-colors">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
                    <div className="col-span-1 md:col-span-2">
                        <div className="flex items-center gap-2 mb-4">
                            <GraduationCap className="h-8 w-8 text-blue-600 dark:text-blue-500" />
                            <span className="text-2xl font-bold text-slate-900 dark:text-white">ReValuate</span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-400 max-w-sm">
                            Empowering students and teachers with a transparent, AI-driven exam revaluation system.
                        </p>
                    </div>

                    <div>
                        <h3 className="text-slate-900 dark:text-white font-semibold mb-4">Quick Links</h3>
                        <ul className="space-y-2">
                            <li><Link to="/home" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Home</Link></li>
                            <li><Link to="/track-status" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Check Status</Link></li>
                            <li><Link to="/login" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Login</Link></li>
                            <li><Link to="/signup" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Sign Up</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="text-slate-900 dark:text-white font-semibold mb-4">Contact</h3>
                        <ul className="space-y-2">
                            <li className="flex items-center gap-2">
                                <Mail className="w-4 h-4" aria-hidden="true" />
                                <a href="mailto:smartrevaluationsystem@gmail.com" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">smartrevaluationsystem@gmail.com</a>
                            </li>
                            <li>Chennai,Tamil Nadu</li>
                        </ul>
                    </div>
                </div>

                <div className="pt-8 border-t border-slate-200 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-sm text-slate-500 dark:text-slate-500">© 2025 ReValuate. All rights reserved.</p>
                    <div className="flex gap-4">
                        <a href="#" aria-label="GitHub" className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"><Github className="w-5 h-5" aria-hidden="true" /></a>
                        <a href="#" aria-label="Twitter" className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"><Twitter className="w-5 h-5" aria-hidden="true" /></a>
                        <a href="#" aria-label="LinkedIn" className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"><Linkedin className="w-5 h-5" aria-hidden="true" /></a>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
