import React from 'react';
import '../../styles/AdminPage.css';

interface Member {
  uid: string;
  email: string;
  eventsAttended: number;
}

interface MembersProps {
  members: Member[];
  handleRemoveMember: (uid: string) => void;
}

const Members: React.FC<MembersProps> = ({ members, handleRemoveMember }) => (
  <div className="login-box">
    <h2 className="admin-header">Manage Members</h2>
    <div className="table-container">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Email</th>
            <th>Events Attended</th>
            <th className="center">Remove</th>
          </tr>
        </thead>
        <tbody>
          {members.map(member => (
            <tr key={member.uid}>
              <td>{member.email}</td>
              <td>{member.eventsAttended}</td>
              <td className="center">
                <button
                  onClick={() => handleRemoveMember(member.uid)}
                  className="remove-btn"
                >
                  ×
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

export default Members;
