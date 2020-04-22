import getObject from "./aws";
import {
  capitalize,
  replaceUnderscore,
  getItem,
  specIconPrefix,
  specIconExt
} from "./util";

/**
 * Fetch data from AWS and load it into browser's local storage
 */
async function loadAllData() {
  // Fetch data from AWS
  const data = await getObject("master.json");

  // Cache data in localStorage
  Object.entries(data).forEach(([key, val]) => {
    window.localStorage.setItem(key, JSON.stringify(val));
  });
}

/**
 * Get all academic levels, to display in a dropdown list
 * @returns {Array} array of objects, each representing a level
 */
function getAllLevels() {
  const programsItem = getItem("programs");
  const levels = Object.keys(programsItem);
  const optionElements = levels.map(l => ({
    value: l,
    text: capitalize(replaceUnderscore(l))
  }));
  return optionElements;
}

/**
 * Get all study programs for a given academic level, to display in a dropdown list
 * @param {string} level - the given academic level
 * @returns {Array} array of objects, each representing a program
 */
function getProgramsByLevel(level) {
  if (!level) {
    return [];
  }
  const programsItem = getItem("programs");
  const optionElements = Object.keys(programsItem[level]);

  // value and text attributes for option elements are equal
  // so no need to map the keys to { value, text } objects
  return optionElements;
}

/**
 * Get all specializations for a given master's programs, to display in a dropdown list
 * @param {string} program - the master's program
 * @returns {Array} array of objects, each representing a specialization
 */
function getMasterspecsByProgram(program) {
  const masterspecsItem = getItem("masterspecs");
  if (program in masterspecsItem) {
    // return specs if program has specs
    const { spec_key } = masterspecsItem[program];

    const optionElements = Object.entries(spec_key).map(([key, val]) => ({
      value: key,
      text: val,
      iconUrl: `${specIconPrefix}${key}${specIconExt}`
    }));
    return optionElements;
  }

  return [];
}

/**
 * Gets course info for all given course ids
 * @param {Array} ids - course ids
 * @returns {Array} filtered entries of coursesItem object containing only keys that exist in ids
 */
const getCoursesByIds = ids => {
  const coursesItem = getItem("courses");
  if (!ids) {
    // All courses if ids is not provided
    return Object.entries(coursesItem);
  }
  return Object.entries(coursesItem).filter(c => ids.includes(c[0]));
};

/**
 * Gets course info for all given course ids
 * @param {string} level - academic level
 * @param {string} program - study program
 * @param {string} masterspec - specialization (level needs to be "master")
 * @returns {Array} matching courses, array of [id, value] pairs, where value is Object
 */
function getCourses({
  // selectedSection: section = "",
  selectedLevel: level = "",
  selectedProgram: program = "",
  selectedMasterspec: masterspec = ""
} = {}) {
  if (masterspec && level !== "master") {
    throw new Error(`
      The academic level needs to be master when selecting a specialization
    `);
  }

  // All master's programs with specializations
  const masterProgramsWithSpecs = Object.keys(getItem("masterspecs"));

  if (!level) {
    // All courses
    return getCoursesByIds();
  } else if (!program) {
    // All courses for the given level
    const programsItem = getItem("programs");
    const programs = programsItem[level];
    const coursesArrays = Object.values(programs);
    const courseIds = [].concat(...coursesArrays);
    return getCoursesByIds(courseIds);
  } else if (!masterProgramsWithSpecs.includes(program) || level !== "master") {
    // All courses for the given level and program returned without
    // specializations info if the program does not have any or level is not master
    const programsItem = getItem("programs");
    const courseIds = programsItem[level][program];
    return getCoursesByIds(courseIds);
  } else {
    // Program has specializations, fetch course ids from masterspecs object
    const masterspecsItem = getItem("masterspecs");

    const {
      spec_key,
      specs: coursesPerSpec,
      courses: specsPerCourse
    } = masterspecsItem[program];

    let courseIds;
    if (!masterspec) {
      // No specialization selected, return all courses
      courseIds = Object.keys(specsPerCourse);
    } else {
      // Masterspec was selected, retrieve list of courses from specs object
      courseIds = coursesPerSpec[masterspec];
    }

    const courses = getCoursesByIds(courseIds);

    const specsPerCourseWithInfo = Object.fromEntries(
      Object.entries(specsPerCourse).map(([k, v]) => [
        // v is an array of all spec ids for course k
        // we map each [k, v] entry to [k, Object]
        // and then create an Object {k: Object} from the resulting entries
        k,
        {
          // each entry value is mapped to an Object {specs: Array(Object)}
          specs: v.map(id => ({
            id,
            name: spec_key[id],
            iconUrl: `${specIconPrefix}${id}${specIconExt}`
          }))
        }
      ])
    );

    // specsPerCourseWithInfo contains all courses for the program,
    // but we only want to keep those for the selected specialization
    const coursesWithSpecInfo = courses.map(([k, v]) => [
      k,
      { ...v, ...specsPerCourseWithInfo[k] } // add specs property
    ]);

    return coursesWithSpecInfo;
  }
}

export default {
  loadAllData,
  getAllLevels,
  getProgramsByLevel,
  getMasterspecsByProgram,
  getCourses
};
