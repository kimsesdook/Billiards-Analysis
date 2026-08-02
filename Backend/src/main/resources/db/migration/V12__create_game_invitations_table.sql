CREATE TABLE game_invitations (
    id BIGINT NOT NULL AUTO_INCREMENT,
    requester_id BIGINT NOT NULL,
    receiver_id BIGINT NOT NULL,
    game_type VARCHAR(30) NOT NULL,
    invitation_status VARCHAR(30) NOT NULL,
    expires_at DATETIME(6) NOT NULL,
    responded_at DATETIME(6),
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_game_invitations_requester
        FOREIGN KEY (requester_id) REFERENCES members (id),
    CONSTRAINT fk_game_invitations_receiver
        FOREIGN KEY (receiver_id) REFERENCES members (id)
);

CREATE INDEX idx_game_invitations_requester_status
    ON game_invitations (requester_id, invitation_status, created_at);

CREATE INDEX idx_game_invitations_receiver_status
    ON game_invitations (receiver_id, invitation_status, created_at);

CREATE INDEX idx_game_invitations_pair_status
    ON game_invitations (requester_id, receiver_id, invitation_status);
