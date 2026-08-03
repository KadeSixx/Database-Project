-- Allow a member to be deleted without leaving orphaned payment records.
USE gym_db;

ALTER TABLE payments
  DROP FOREIGN KEY fk_payment_member;

ALTER TABLE payments
  ADD CONSTRAINT fk_payment_member
  FOREIGN KEY (member_id) REFERENCES members(member_id)
  ON UPDATE CASCADE ON DELETE CASCADE;
