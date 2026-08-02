CREATE TABLE game_rooms (
    id BIGINT NOT NULL AUTO_INCREMENT,
    host_member_id BIGINT NOT NULL,
    room_name VARCHAR(50) NOT NULL,
    join_code VARCHAR(12) NOT NULL,
    game_type VARCHAR(30) NOT NULL,
    game_mode VARCHAR(30) NOT NULL,
    player_capacity INT NOT NULL,
    room_status VARCHAR(30) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_game_rooms_join_code UNIQUE (join_code),
    CONSTRAINT fk_game_rooms_host
        FOREIGN KEY (host_member_id) REFERENCES members (id)
);

CREATE TABLE game_room_participants (
    id BIGINT NOT NULL AUTO_INCREMENT,
    game_room_id BIGINT NOT NULL,
    member_id BIGINT NOT NULL,
    participant_role VARCHAR(30) NOT NULL,
    target_score INT NOT NULL,
    is_ready BOOLEAN NOT NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_game_room_participants_room_member UNIQUE (game_room_id, member_id),
    CONSTRAINT fk_game_room_participants_room
        FOREIGN KEY (game_room_id) REFERENCES game_rooms (id),
    CONSTRAINT fk_game_room_participants_member
        FOREIGN KEY (member_id) REFERENCES members (id)
);

CREATE INDEX idx_game_rooms_host_status
    ON game_rooms (host_member_id, room_status, updated_at);

CREATE INDEX idx_game_room_participants_member_room
    ON game_room_participants (member_id, game_room_id);
