ALTER TABLE game_rooms
    ADD COLUMN current_inning INT NOT NULL DEFAULT 1;

ALTER TABLE game_rooms
    ADD COLUMN active_member_id BIGINT NULL;

ALTER TABLE game_rooms
    ADD COLUMN state_version BIGINT NOT NULL DEFAULT 0;

ALTER TABLE game_rooms
    ADD CONSTRAINT fk_game_rooms_active_member
        FOREIGN KEY (active_member_id) REFERENCES members (id);

ALTER TABLE game_room_participants
    ADD COLUMN current_score INT NOT NULL DEFAULT 0;

ALTER TABLE game_room_participants
    ADD COLUMN cushion_score INT NOT NULL DEFAULT 0;

ALTER TABLE game_room_participants
    ADD COLUMN high_run INT NOT NULL DEFAULT 0;
