import React, { useState } from 'react';
import placeholderImage from '../assets/depositphotos_104564156-stock-illustration-male-user-icon.jpg';
import '../styles/FlipCard.css';
import '../styles/CreditsPage.css';

interface CreditsPageProps {
  navigateTo: (page: string, errorMessage?: string) => void;
  error?: string;
}

interface ContributorData {
  name: string;
  role: string;
  bio: string;
  linkedin: string;
  imagePath?: string;
}

const CreditsPage: React.FC<CreditsPageProps> = ({ navigateTo, error }) => {
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
      name: "Alan Li", 
      role: "About Us", 
      bio: "2026",
      linkedin: "https://www.linkedin.com/in/alanli6/",
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
    <div className="about-container relative-z-1">
      <div className="about-background about-background-low"></div>
      {error && (
        <div className="error-message relative-z-2">
          {error}
        </div>
      )}
      <h1 className="about-title text-white relative-z-2">Credits</h1>

      <div className="about-content relative-z-2">
        <div className="mb-[30px]">
          <h2 className="text-white mb-[10px]">Website Development</h2>
          <ul className="list-none text-white">
            <li>Brought to you by: Spring 2025 JHU ACM Coding Circle</li>
            <li>Framework: React with TypeScript</li>
          </ul>
        </div>

        <h2 className="text-white mb-[20px]">Contributors</h2>

        <div className="contributors-grid">
          {contributorsData.map((contributor, index) => (
            <div
              key={index}
              className={`flip-card ${flippedCards.includes(index) ? 'flipped' : ''} cursor-pointer`}
              onClick={() => toggleFlip(index)}
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
                  <h3 className="m-0 mb-[5px] text-[1rem]">{contributor.name}</h3>
                  <h4 className="m-0 mb-[5px] font-normal text-[0.9rem]">{contributor.role}</h4>
                  <p className="text-[0.8rem] m-0 mb-2">{contributor.bio}</p>
                  <a
                    href={contributor.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="linkedin-link"
                  >
                    LinkedIn
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="my-[30px]">
          <h2 className="text-white mb-[10px]">Special Thanks</h2>
          <ul className="list-none text-white">
            <li>JHU Computer Science Department</li>
            <li>ACM National Organization</li>
            <li>All our dedicated members</li>
          </ul>
        </div>

        <div className="mb-[30px]">
          <h2 className="text-white mb-[10px]">Contact</h2>
          <p className="text-white">For questions or feedback about this website, please contact:</p>
          <p><a href="mailto:acm@jhu.edu" className="text-white underline">acm@jhu.edu</a></p>
        </div>
      </div>
      
      <button
        className="home-button credits-home-button"
        onClick={() => navigateTo('home')}
      >
        Back to Home
      </button>
      
      <div
        onClick={() => navigateTo('credits')}
        className="credits-footer"
      >
        made with lots of ❤️ @JHU ACM
      </div>
    </div>
  );
};

export default CreditsPage; 
