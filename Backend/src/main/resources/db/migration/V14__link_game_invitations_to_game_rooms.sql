ALTER TABLE game_invitations
    ADD COLUMN game_room_id BIGINT;

ALTER TABLE game_invitations
    ADD CONSTRAINT fk_game_invitations_game_room
        FOREIGN KEY (game_room_id) REFERENCES game_rooms (id);

CREATE INDEX idx_game_invitations_game_room_status
    ON game_invitations (game_room_id, invitation_status);
