import React from 'react';
import { Facebook, Twitter, Linkedin } from 'lucide-react';

export default function SocialWidgets({ social }) {
  const fb = social?.facebook || { friends: '89k', feeds: '459' };
  const tw = social?.twitter || { followers: '973k', tweets: '1.792' };
  const li = social?.linkedin || { contacts: '500+', feeds: '1.292' };

  return (
    <div className="social-widgets-row">
      {/* 1. Facebook */}
      <div className="social-card social-facebook">
        <div className="social-icon-wrapper">
          <Facebook size={46} strokeWidth={1.5} color="#ffffff" fill="#ffffff" />
        </div>
        <div className="social-stats">
          <div className="social-stat-col">
            <strong className="stat-val">{fb.friends}</strong>
            <span className="stat-lbl">friends</span>
          </div>
          <div className="social-divider" />
          <div className="social-stat-col">
            <strong className="stat-val">{fb.feeds}</strong>
            <span className="stat-lbl">feeds</span>
          </div>
        </div>
      </div>

      {/* 2. Twitter */}
      <div className="social-card social-twitter">
        <div className="social-icon-wrapper">
          <Twitter size={46} strokeWidth={1.5} color="#ffffff" fill="#ffffff" />
        </div>
        <div className="social-stats">
          <div className="social-stat-col">
            <strong className="stat-val">{tw.followers}</strong>
            <span className="stat-lbl">followers</span>
          </div>
          <div className="social-divider" />
          <div className="social-stat-col">
            <strong className="stat-val">{tw.tweets}</strong>
            <span className="stat-lbl">tweets</span>
          </div>
        </div>
      </div>

      {/* 3. LinkedIn */}
      <div className="social-card social-linkedin">
        <div className="social-icon-wrapper">
          <Linkedin size={46} strokeWidth={1.5} color="#ffffff" fill="#ffffff" />
        </div>
        <div className="social-stats">
          <div className="social-stat-col">
            <strong className="stat-val">{li.contacts}</strong>
            <span className="stat-lbl">contacts</span>
          </div>
          <div className="social-divider" />
          <div className="social-stat-col">
            <strong className="stat-val">{li.feeds}</strong>
            <span className="stat-lbl">feeds</span>
          </div>
        </div>
      </div>
    </div>
  );
}
