import React from 'react';
import './../styles/LoginPage.css';

interface Member {
  uid: string;
  email: string;
  eventsAttended: number;
}

interface Props {
  members: Member[];
  onRemove: (uid: string) => void;
}

const MembersList: React.FC<Props> = ({ members, onRemove }) => (
  <div className="login-box bg-white rounded-md p-5 shadow">
    <h2 className="mb-5 text-gray-700 border-b-2 border-gray-200 pb-2">Manage Members</h2>
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b-2 border-gray-300">
            <th className="p-3 text-left text-gray-700">Email</th>
            <th className="p-3 text-left text-gray-700">Events Attended</th>
            <th className="p-3 text-center text-gray-700">Remove</th>
          </tr>
        </thead>
        <tbody>
          {members.map((member) => (
            <tr key={member.uid} className="border-b border-gray-300">
              <td className="p-3 text-gray-700">{member.email}</td>
              <td className="p-3 text-gray-700">{member.eventsAttended}</td>
              <td className="p-3 text-center">
                <button
                  onClick={() => onRemove(member.uid)}
                  className="text-red-600 hover:bg-red-100 w-6 h-6 flex items-center justify-center rounded-full"
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

export default MembersList;

