-- App-scoped provider hold; independent from native table binding and routing.
-- After fresh pre-install protection. Admission starts open; this does not pause writers.
CREATE TABLE barrier_marquee_20260930_v2.provider_admission (
 id boolean PRIMARY KEY DEFAULT true CHECK(id), admission_open boolean NOT NULL DEFAULT true
);
INSERT INTO barrier_marquee_20260930_v2.provider_admission(id) VALUES(true);
REVOKE ALL ON barrier_marquee_20260930_v2.provider_admission FROM PUBLIC;
