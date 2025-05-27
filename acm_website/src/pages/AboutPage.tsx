import React, { useState } from 'react';
import placeholderImage from '../assets/depositphotos_104564156-stock-illustration-male-user-icon.jpg';
import miseokImage from '../assets/alumni/miseok kim.jpg';
import juliaImage from '../assets/alumni/julia bian.jpeg';
import nishImage from '../assets/alumni/nish.jpeg';
import chaseImage from '../assets/alumni/chase feng.jpeg';
import '../styles/FlipCard.css';
import '../styles/AboutPage.css';

interface AboutPageProps {
  navigateTo: (page: string, errorMessage?: string) => void;
  error?: string;
}

interface PersonData {
  name: string;
  role: string;
  bio: string;
  linkedin: string;
  imagePath?: string;
}

const AboutPage: React.FC<AboutPageProps> = ({ navigateTo, error }) => {
  // State to track which cards are flipped
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [flippedAlumniCards, setFlippedAlumniCards] = useState<number[]>([]);

  // Toggle flip state for a card
  const toggleFlip = (index: number) => {
    if (flippedCards.includes(index)) {
      setFlippedCards(flippedCards.filter(i => i !== index));
    } else {
      setFlippedCards([...flippedCards, index]);
    }
  };

  // Toggle flip state for an alumni card
  const toggleAlumniFlip = (index: number) => {
    if (flippedAlumniCards.includes(index)) {
      setFlippedAlumniCards(flippedAlumniCards.filter(i => i !== index));
    } else {
      setFlippedAlumniCards([...flippedAlumniCards, index]);
    }
  };

  // Leadership data
  const leadershipData: PersonData[] = [
    { 
      name: "Spencer Ye", 
      role: "President", 
      bio: "2027",
      linkedin: "https://www.linkedin.com/in/spencerye/",
      imagePath: "/images/team/spencer.jpg"
    },
    { 
      name: "Elizabeth Fu", 
      role: "Vice President", 
      bio: "2027",
      linkedin: "https://www.linkedin.com/in/elizabeth-f-773b78244/",
      imagePath: "/images/team/elizabeth.jpg"
    },
    { 
      name: "Ria Talwar", 
      role: "Treasurer", 
      bio: "2027",
      linkedin: "https://www.linkedin.com/in/ria-talwar-cs2027/",
      imagePath: "/images/team/ria.jpg"
    },
    { 
      name: "Mischa Kumar", 
      role: "Secretary", 
      bio: "2028",
      linkedin: "https://www.linkedin.com/in/mischa-kumar-274631298/",
      imagePath: "/images/team/mischa.jpg"
    },
    { 
      name: "Timothy Lin", 
      role: "ICPC Head", 
      bio: "2026",
      linkedin: "https://www.linkedin.com/in/tlin2004/",
      imagePath: "/images/team/timothy.jpg"
    },
    { 
      name: "Liam Finn", 
      role: "Outreach Chair", 
      bio: "2027",
      linkedin: "https://www.linkedin.com/in/liam-finn-11o37/",
      imagePath: "/images/team/liam.jpg"
    },
    { 
      name: "Tianai Yue", 
      role: "Events Chair", 
      bio: "2026",
      linkedin: "https://www.linkedin.com/in/tianai-yue-70981523b/",
      imagePath: "/images/team/tianai.jpg"
    },
    { 
      name: "Alan Li", 
      role: "General Officer", 
      bio: "2026",
      linkedin: "https://www.linkedin.com/in/alanli6/",
      imagePath: "/images/team/alan.jpg"
    },
    { 
      name: "Vrinda Sehgal", 
      role: "General Officer", 
      bio: "2028",
      linkedin: "https://www.linkedin.com/in/vrinda-sehgal-0000000000/",
      imagePath: "/images/team/vrinda.jpg"
    },
    { 
      name: "Vicki Chen", 
      role: "General Officer", 
      bio: "2028",
      linkedin: "https://www.linkedin.com/in/vickichenn/",
      imagePath: "/images/team/vicki.jpg"
    }
  ];

  // Alumni data
  const alumniData: PersonData[] = [
    { 
      name: "Miseok Kim", 
      role: "2025", 
      bio: "Google",
      linkedin: "https://www.linkedin.com/in/miseok-k-aa4202195/",
      imagePath: miseokImage
    },
    { 
      name: "Julia Bian", 
      role: "2024", 
      bio: "Meta",
      linkedin: "https://www.linkedin.com/in/juliabian/",
      imagePath: juliaImage
    },
    { 
      name: "Nish Paruchuri", 
      role: "2024", 
      bio: "MS @ Stanford",
      linkedin: "https://www.linkedin.com/in/nishikarp/",
      imagePath: nishImage
    },
    { 
      name: "Chase Feng", 
      role: "2025", 
      bio: "IMC Trading",
      linkedin: "https://www.linkedin.com/in/chasejhu/",
      imagePath: chaseImage
    }
  ];

  return (
    <div className="about-container relative-z-1">
      {error && (
            <div className="error-message">
              {error}
            </div>
          )}
      <div className="about-background about-background-low"></div>
      <h1 className="about-title relative-z-2 text-white">About Us</h1>
      
      <div className="about-content relative-z-2">
        <p className="text-white">
          We are a student organization of the Johns Hopkins University dedicated to furthering the knowledge and advancement of computers and 
          information technology through the free exchange of ideas and information. As a chapter of the oldest computing society in the world, the JHU ACM 
          is a place for diverse backgrounds and interests, and serves the JHU community as a whole. During the semester, the ACM has weekly meetings in 
          Malone announced via email and posted on our <a href="#" className="link text-white underline">Facebook</a> page and the <a href="#" className="link text-white underline">Events</a> section of this website.
        </p>
      </div>
      
      <h2 className="leadership-title relative-z-2 text-white">Officers</h2>
      <div className="card-grid">
        {leadershipData.map((leader, index) => (
          <div
            key={index}
            className={`flip-card ${flippedCards.includes(index) ? 'flipped' : ''} cursor-pointer`}
            onClick={() => toggleFlip(index)}
          >
            <div className="flip-card-inner">
              <div className="flip-card-front">
                <img 
                  src={leader.imagePath || placeholderImage} 
                  alt={`${leader.name}`} 
                  onError={(e) => {
                    e.currentTarget.src = placeholderImage;
                  }}
                />
              </div>
              <div className="flip-card-back">
                <h3 className="m-0 mb-[5px] text-[1rem] text-white">{leader.name}</h3>
                <h4 className="m-0 mb-[5px] font-normal text-[0.9rem] text-white">{leader.role}</h4>
                <p className="text-[0.8rem] m-0 mb-2 text-white">{leader.bio}</p>
                <a
                  href={leader.linkedin}
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
      
      <h2 className="alumni-title text-white mt-[40px]">Alumni</h2>
      <div className="card-grid">
        {alumniData.map((alumni, index) => (
          <div
            key={index}
            className={`flip-card ${flippedAlumniCards.includes(index) ? 'flipped' : ''} cursor-pointer`}
            onClick={() => toggleAlumniFlip(index)}
          >
            <div className="flip-card-inner">
              <div className="flip-card-front">
                <img 
                  src={alumni.imagePath || placeholderImage} 
                  alt={`${alumni.name}`} 
                  onError={(e) => {
                    e.currentTarget.src = placeholderImage;
                  }}
                />
              </div>
              <div className="flip-card-back">
                <h3 className="m-0 mb-[5px] text-[1rem] text-white">{alumni.name}</h3>
                <h4 className="m-0 mb-[5px] font-normal text-[0.9rem] text-white">{alumni.role}</h4>
                <p className="text-[0.8rem] m-0 mb-2 text-white">{alumni.bio}</p>
                <a
                  href={alumni.linkedin}
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
      
      <button className="home-button" onClick={() => navigateTo('home')}>Back to Home</button>
      
      <div
        onClick={() => navigateTo('credits')}
        className="credits-footer"
      >
        made with lots of ❤️ @JHU ACM
      </div>
    </div>
  );
};

export default AboutPage; 
