import React, { useState } from 'react';
import placeholderImage from '../assets/depositphotos_104564156-stock-illustration-male-user-icon.jpg';
import '../styles/FlipCard.css';

interface CreditsPageProps {
  navigateTo: (page: string) => void;
}

interface ContributorData {
  name: string;
  role: string;
  bio: string;
  linkedin: string;
  imagePath?: string;
}

const CreditsPage: React.FC<CreditsPageProps> = ({ navigateTo }) => {
  // State to track which cards are flipped
  const [flippedCards, setFlippedCards] = useState<number[]>([]);

  // Toggle flip state for a card
  const toggleFlip = (index: number) => {
    if (flippedCards.includes(index)) {
      setFlippedCards(flippedCards.filter(i => i !== index));
    } else {
      setFlippedCards([...flippedCards, index]);
    }
  };

  // Contributors data
  const contributorsData: ContributorData[] = [
    { 
      name: "John Doe", 
      role: "Lead Developer", 
      bio: "Implemented core functionality and architecture.",
      linkedin: "https://www.linkedin.com/in/jhu-acm-dev",
      imagePath: "/images/contributors/john.jpg"
    },
    { 
      name: "Jane Smith", 
      role: "UI/UX Designer", 
      bio: "Created the visual design and user experience.",
      linkedin: "https://www.linkedin.com/in/jhu-acm-design",
      imagePath: "/images/contributors/jane.jpg"
    },
    { 
      name: "Alex Johnson", 
      role: "Backend Developer", 
      bio: "Built the server infrastructure and APIs.",
      linkedin: "https://www.linkedin.com/in/jhu-acm-backend",
      imagePath: "/images/contributors/alex.jpg"
    },
    { 
      name: "Sam Wilson", 
      role: "Content Manager", 
      bio: "Developed and organized website content.",
      linkedin: "https://www.linkedin.com/in/jhu-acm-content",
      imagePath: "/images/contributors/sam.jpg"
    }
  ];

  return (
    <div className="about-container">
      <h1 className="about-title" style={{ color: 'white' }}>Credits</h1>
      
      <div className="about-content">
        <div style={{ marginBottom: '30px' }}>
          <h2 style={{ color: 'white', marginBottom: '10px' }}>Website Development</h2>
          <ul style={{ listStyleType: 'none', color: 'white' }}>
            <li>Design & Implementation: JHU ACM Web Team</li>
            <li>Framework: React with TypeScript</li>
          </ul>
        </div>
        
        <h2 style={{ color: 'white', marginBottom: '20px' }}>Contributors</h2>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(4, 1fr)', 
          gap: '20px', 
          margin: '30px 0' 
        }}>
          {contributorsData.map((contributor, index) => (
            <div 
              key={index} 
              className={`flip-card ${flippedCards.includes(index) ? 'flipped' : ''}`}
              onClick={() => toggleFlip(index)}
              style={{ cursor: 'pointer' }}
            >
              <div className="flip-card-inner">
                <div className="flip-card-front">
                  <img 
                    src={contributor.imagePath || placeholderImage} 
                    alt={`${contributor.name}`} 
                    onError={(e) => {
                      e.currentTarget.src = placeholderImage;
                    }}
                  />
                </div>
                <div className="flip-card-back">
                  <h3 style={{ margin: '0 0 5px 0', fontSize: '1rem' }}>{contributor.name}</h3>
                  <h4 style={{ margin: '0 0 5px 0', fontWeight: 'normal', fontSize: '0.9rem' }}>{contributor.role}</h4>
                  <p style={{ fontSize: '0.8rem', margin: '0 0 8px 0' }}>{contributor.bio}</p>
                  <a 
                    href={contributor.linkedin} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      color: '#0077b5',
                      textDecoration: 'none',
                      fontSize: '0.8rem',
                      backgroundColor: 'white',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      display: 'inline-block'
                    }}
                  >
                    LinkedIn
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div style={{ marginBottom: '30px', marginTop: '30px' }}>
          <h2 style={{ color: 'white', marginBottom: '10px' }}>Special Thanks</h2>
          <ul style={{ listStyleType: 'none', color: 'white' }}>
            <li>JHU Computer Science Department</li>
            <li>ACM National Organization</li>
            <li>All our dedicated members</li>
          </ul>
        </div>
        
        <div style={{ marginBottom: '30px' }}>
          <h2 style={{ color: 'white', marginBottom: '10px' }}>Contact</h2>
          <p style={{ color: 'white' }}>For questions or feedback about this website, please contact:</p>
          <p><a href="mailto:acm@jhu.edu" style={{ color: 'white', textDecoration: 'underline' }}>acm@jhu.edu</a></p>
        </div>
      </div>
      
      <button 
        className="home-button" 
        onClick={() => navigateTo('home')}
        style={{ 
          padding: '8px 16px',
          backgroundColor: '#3366cc',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          marginTop: '20px'
        }}
      >
        Back to Home
      </button>
      
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
          backdropFilter: 'blur(2px)'
        }}
      >
        made with lots of ❤️ @JHU ACM
      </div>
    </div>
  );
};

export default CreditsPage; 