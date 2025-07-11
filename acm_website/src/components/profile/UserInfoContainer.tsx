import React, { memo } from 'react';

interface UserInfoProps {
  email: string;
  isMember: boolean;
  isOnMailingList: boolean;
  memberError: string;
  memberSuccess: string;
  onBecomeMember: () => void;
  onJoinMailingList: () => void;
  onUnsubscribeMailingList: () => void;
  onLogout: () => void;
  onDeleteAccount: () => void;
  onChangePassword: () => void;
}

const UserInfoContainer: React.FC<UserInfoProps> = memo(({
  email,
  isMember,
  isOnMailingList,
  memberError,
  memberSuccess,
  onBecomeMember,
  onJoinMailingList,
  onUnsubscribeMailingList,
  onLogout,
  onDeleteAccount,
  onChangePassword,
}) => {
  return (
    <div className="profile-section">
      <h2 className="section-title">Profile Information</h2>
      
      <div className="profile-info-sections">
        <div className="info-card">
          <div className="info-label">Account Email</div>
          <div className="info-value">{email}</div>
        </div>

        <div className="info-card">
          <div className="info-label">ACM Membership</div>
          <div className="info-content">
            <div className="info-actions">
              <div className={`info-value ${isMember ? 'status-active' : ''}`}>
                {isMember ? 'Active Member' : 'Not a member'}
              </div>
              {!isMember && (
                <button className="profile-btn primary" onClick={onBecomeMember}>
                  Become a Member
                </button>
              )}
            </div>
            {(memberError || memberSuccess) && (
              <div className={`member-message ${memberError ? 'error' : 'success'}`}>
                {memberError || memberSuccess}
              </div>
            )}
          </div>
        </div>

        <div className="info-card">
          <div className="info-label">Mailing List</div>
          <div className="info-actions">
            <div className="info-value">
              {isOnMailingList ? 'Subscribed' : 'Not subscribed'}
            </div>
            {isOnMailingList ? (
              <button className="profile-btn secondary" onClick={onUnsubscribeMailingList}>
                Unsubscribe
              </button>
            ) : (
              <button className="profile-btn primary" onClick={onJoinMailingList}>
                Subscribe
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="profile-actions">
        <h3 className="actions-title">Account Management</h3>
        <div className="actions-grid">
          <button className="profile-btn primary" onClick={onChangePassword}>
            Change Password
          </button>
          <button className="profile-btn secondary" onClick={onLogout}>
            Logout
          </button>
          <button className="profile-btn danger" onClick={onDeleteAccount}>
            Delete Account
          </button>
        </div>
      </div>
    </div>
  );
});

UserInfoContainer.displayName = 'UserInfoContainer';

export default UserInfoContainer;
