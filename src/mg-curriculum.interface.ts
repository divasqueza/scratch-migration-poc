interface CourseInterface {
  globalID: string;
  name: string;
}

export interface MgCurriculumInterface {
  globalID: string;
  name: string;
  courses: CourseInterface[],
}