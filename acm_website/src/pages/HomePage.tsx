import React from 'react';
import Navbar from '../components/Navbar';

interface HomePageProps {
  navigateTo: (page: string, errorMessage?: string) => void;
  error?: string;
}

const HomePage: React.FC<HomePageProps> = ({ navigateTo, error }) => {


  return (
    <>
      <Navbar navigateTo={navigateTo} />
      <div className="flex flex-col items-center justify-center min-h-[70vh] p-8" style={{ position: 'relative', zIndex: 1 }}>
      <div className="about-background" style={{ zIndex: -1 }}></div>
      
      {error && (
        <div className="error-message" style={{ position: 'relative', zIndex: 2 }}>
          {error}
        </div>
      )}
      
      <h1 className="text-4xl font-bold mb-4 text-gray-800" style={{ position: 'relative', zIndex: 2 }}>Welcome to JHU ACM</h1>
      <p className="text-xl mb-8 text-gray-600" style={{ position: 'relative', zIndex: 2 }}>Association for Computing Machinery</p>
      </div>
      
      <div 
        onClick={() => navigateTo('credits')}
        style={{ 
          fontSize: '0.8rem', 
          textAlign: 'center', 
          position: 'fixed',
          bottom: '0',
          left: '0',
          right: '0',
          color: 'white',
          opacity: 0.8,
          cursor: 'pointer',
          backgroundColor: 'rgba(50, 50, 50, 0.5)',
          padding: '8px 0',
          backdropFilter: 'blur(2px)',
          zIndex: 2
        }}
      >
        Made with lots of ❤️ by JHU ACM
      </div>
    </>
  );
};

export default HomePage;