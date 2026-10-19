USE TutorPlatformDB;
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Questions') AND name = 'GradeLevel')
BEGIN
    ALTER TABLE Questions ADD GradeLevel NVARCHAR(50) NULL;
    PRINT 'Added GradeLevel to Questions.';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('TutorSubjects') AND name = 'GradeLevel')
BEGIN
    ALTER TABLE TutorSubjects ADD GradeLevel NVARCHAR(50) NULL;
    PRINT 'Added GradeLevel to TutorSubjects.';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('TutorTestAttempts') AND name = 'GradeLevel')
BEGIN
    ALTER TABLE TutorTestAttempts ADD GradeLevel NVARCHAR(50) NULL;
    PRINT 'Added GradeLevel to TutorTestAttempts.';
END
GO
