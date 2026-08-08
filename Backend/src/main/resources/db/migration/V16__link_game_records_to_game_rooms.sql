ALTER TABLE game_records
    ADD COLUMN game_room_id BIGINT NULL;

ALTER TABLE game_records
    ADD CONSTRAINT fk_game_records_game_room
        FOREIGN KEY (game_room_id) REFERENCES game_rooms (id);

CREATE UNIQUE INDEX uk_game_records_room_member
    ON game_records (game_room_id, member_id);
