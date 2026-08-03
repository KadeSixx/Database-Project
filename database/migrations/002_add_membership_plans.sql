-- Add the membership options represented by the Phase 2 frontend.
USE gym_db;

INSERT INTO membership_plans
  (plan_id, plan_name, monthly_cost, duration_days, benefits)
VALUES
  ('P-01', 'Basic', 29.00, 31, 'Gym floor and locker room access'),
  ('P-02', 'Standard', 49.00, 31, 'Gym access and unlimited group classes'),
  ('P-04', 'Premium', 79.00, 31, 'Unlimited classes, sauna access, and one trainer session'),
  ('P-05', 'Annual', 499.00, 365, 'Full-year gym and group class access')
ON DUPLICATE KEY UPDATE
  plan_name = VALUES(plan_name),
  monthly_cost = VALUES(monthly_cost),
  duration_days = VALUES(duration_days),
  benefits = VALUES(benefits);
