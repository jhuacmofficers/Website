import React from 'react';
import './../styles/LoginPage.css';

interface Props {
  onLogout: () => void;
}

const AccountSection: React.FC<Props> = ({ onLogout }) => (
  <div className="login-box bg-white rounded-md p-5 shadow">
    <h2 className="mb-5 text-gray-700 border-b-2 border-gray-200 pb-2">Account</h2>
    <button
      onClick={onLogout}
      className="login-button bg-blue-900 hover:bg-red-600 text-white w-full"
    >
      Logout
    </button>
  </div>
);

export default AccountSection;

