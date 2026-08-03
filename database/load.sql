-- Corrected, relationally consistent sample data based on Task C.
USE gym_db;

INSERT INTO membership_plans
  (plan_id, plan_name, monthly_cost, duration_days, benefits)
VALUES
  ('P-01', 'Basic', 29.00, 31, 'Gym floor and locker room access'),
  ('P-02', 'Standard', 49.00, 31, 'Gym access and unlimited group classes'),
  ('P-03', 'Gold Tier', 30.00, 31, 'Free Classes, Showers, T-Shirt'),
  ('P-04', 'Premium', 79.00, 31, 'Unlimited classes, sauna access, and one trainer session'),
  ('P-05', 'Annual', 499.00, 365, 'Full-year gym and group class access');

INSERT INTO members
  (member_id, first_name, last_name, phone, email, join_date, plan_id)
VALUES
  ('M-46', 'Jeff', 'Emmerich', '8846514059', 'Mable_Bartell19@hotmail.com', '2025-04-08', 'P-03'),
  ('M-22', 'Courtney', 'O''Hara-Homenick', '7682641302', 'Bruce_Price78@gmail.com', '2025-03-17', 'P-03'),
  ('M-47', 'Jared', 'Bartoletti', '9629238795', 'Nicole.Grant@gmail.com', '2024-12-03', 'P-03'),
  ('M-49', 'Katrina', 'Dibbert', '5589920933', 'Donnie_Lebsack@hotmail.com', '2025-09-10', 'P-03'),
  ('M-33', 'Ada', 'Hodkiewicz', '5057881598', 'Clyde_Davis63@gmail.com', '2024-12-27', 'P-03');

INSERT INTO employees
  (employee_id, first_name, last_name, phone, email, address, salary)
VALUES
  ('E-18', 'Kelly', 'Monahan', '5023488005', 'Wayne_Okuneva@gmail.com', '386 Rodriguez Club', 67992),
  ('E-37', 'Corey', 'Parker', '1955626099', 'Frances.Miller@yahoo.com', '4159 Ottis Light', 82564),
  ('E-03', 'Yolanda', 'Carter', '1476691968', 'Isaac.Paucek21@hotmail.com', '383 Dayne Groves', 67078),
  ('E-49', 'Vivian', 'Berge', '6605909521', 'Virginia.Macejkovic73@hotmail.com', '161 Stoltenberg Center', 98014),
  ('E-30', 'Jeanette', 'Turcotte', '7748166525', 'Randal_Hirthe35@hotmail.com', '574 W Washington Street', 60219);

INSERT INTO trainers (employee_id, join_date, specialization, certification)
VALUES
  ('E-18', '2026-02-03', 'General Fitness', 'National Gym Certification'),
  ('E-37', '2026-03-15', 'Strength Training', 'National Gym Certification'),
  ('E-03', '2026-04-19', 'Mobility', 'National Gym Certification'),
  ('E-49', '2024-11-06', 'Cardio', 'National Gym Certification'),
  ('E-30', '2025-02-16', 'Conditioning', 'National Gym Certification');

INSERT INTO classes
  (class_id, trainer_id, class_name, class_time, capacity, room_location)
VALUES
  ('C-738', 'E-18', 'Ivory', '07:30:00', 22, 'Room 738'),
  ('C-156', 'E-18', 'Magenta', '09:00:00', 31, 'Room 156'),
  ('C-642', 'E-37', 'Azure', '11:30:00', 26, 'Room 642'),
  ('C-729', 'E-49', 'Violet', '17:30:00', 37, 'Room 729'),
  ('C-722', 'E-30', 'Maroon', '19:00:00', 12, 'Room 722');

INSERT INTO enrollments
  (enrollment_id, member_id, class_id, enrollment_date, attendance_status)
VALUES
  ('EN-34A', 'M-46', 'C-738', '2026-08-27', 'Excused'),
  ('EN-44', 'M-22', 'C-156', '2026-02-18', 'Present'),
  ('EN-34B', 'M-47', 'C-642', '2026-10-03', 'Excused'),
  ('EN-11', 'M-49', 'C-729', '2026-07-18', 'Present'),
  ('EN-50', 'M-33', 'C-722', '2026-03-01', 'Absent');

INSERT INTO payments
  (payment_id, member_id, amount, payment_method, payment_status)
VALUES
  ('PAY-19-12', 'M-46', 15, 'Visa', 'Paid'),
  ('PAY-15-13', 'M-22', 35, 'Mastercard', 'Paid'),
  ('PAY-15-10', 'M-47', 83, 'Diners Club', 'Paid'),
  ('PAY-14-07', 'M-49', 11, 'Discover', 'Paid'),
  ('PAY-41-12', 'M-33', 60, 'Maestro', 'Paid');
