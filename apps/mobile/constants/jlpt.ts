/**
 * Re-exported from @japangolearn/content so mobile and web cannot drift.
 *
 * This file previously duplicated the level list with a comment asking whoever
 * touched it to keep both copies in sync by hand. They did drift: the shared
 * list gained an `available` flag and this one would not have had it.
 */
export {
  JLPT_SIGNUP_LEVELS,
  AVAILABLE_JLPT_LEVELS,
  CONTENT_JLPT_LEVEL,
  DEFAULT_JLPT_LEVEL,
  isJlptLevelAvailable,
} from "@japangolearn/content";
