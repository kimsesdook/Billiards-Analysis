CREATE TABLE weekly_ai_reports (
    id BIGINT NOT NULL AUTO_INCREMENT,
    member_id BIGINT NOT NULL,
    game_type VARCHAR(30) NOT NULL,
    report_start_date DATE NOT NULL,
    report_end_date DATE NOT NULL,
    analysis_json TEXT NOT NULL,
    model_name VARCHAR(100) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_weekly_ai_reports_member
        FOREIGN KEY (member_id)
        REFERENCES members (id)
        ON DELETE CASCADE
);

CREATE UNIQUE INDEX uk_weekly_ai_reports_member_type_date
    ON weekly_ai_reports (member_id, game_type, report_end_date);

CREATE INDEX idx_weekly_ai_reports_member_created_at
    ON weekly_ai_reports (member_id, created_at);
