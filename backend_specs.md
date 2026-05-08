

## 1. Database Tables Required

### `Student`
Handles authentication and core identity.
- `id` (Primary Key)
- `student_id_number` (e.g., "221101678" - Unique)
- `first_name` (e.g., "Hadi")
- `last_name` (e.g., "Abdelaziz")
- `email` (e.g., "hadi.abdelaziz@gu.edu.eg" - Unique)
- `password_hash` (Securely hashed password)
- `dob` (Date of Birth)
- `faculty_id` (Foreign Key -> Faculty.id)
- `major_id` (Foreign Key -> Major.id)
- `enrollment_year` (e.g., 2023 - represents their admitted cohort)
- `gpa` (Decimal, e.g., 2.90)
- `credits_completed` (Integer, e.g., 104)


### `Faculty` 
Stores the high-level faculties or colleges.
- `id` (Primary Key)
- `name` (e.g., "Engineering")
- `credits_required` (Integer, e.g., 128)

### `Major` 
Stores the specific majors or tracks within a faculty.
- `id` (Primary Key)
- `faculty_id` (Foreign Key -> Faculty.id)
- `name` (e.g., "Cyber Security")

### `Course`
Stores all available courses in the university.
- `id` (Primary Key)
- `major_id` (Foreign Key -> Major.id) (Allows filtering courses specific to a major; nullable for general university electives)
- `course_code` (e.g., "CSE-111")
- `course_name` (e.g., "Structured Programming")
- `credits` (Integer)

### `AcademicTerm`
Defines the university's active terms and their expected durations.
- `id` (Primary Key)
- `name` (Enum: "Spring", "Fall", "Summer")
- `year` (e.g., 2026)
- `start_date`
- `end_date`
*Standard Durations:*
- **Spring**: Month 10 (October) to end of January
- **Fall**: Mid February to start of June
- **Summer**: Start of July to first week of September

### `Enrollment`
Maps which students are taking which courses.
- `id` (Primary Key)
- `student_id` (Foreign Key -> User.id)
- `course_id` (Foreign Key -> Course.id)
- `status` (Enum: "Enrolled", "Completed", "Failed", "Dropped")
- `term_id` (Foreign Key -> AcademicTerm.id)


### `VehiclePermit`
Manages vehicle access requests and active permits.
- `id` (Primary Key)
- `student_id` (Foreign Key -> User.id)
- `license_plate` (e.g., "XYZ 8992")
- `make` (e.g., "Toyota")
- `model` (e.g., "Corolla")
- `color` (e.g., "Silver")
- `status` (Enum: "Pending", "Approved", "Rejected")
- `requested_at`
- `reviewed_at`




