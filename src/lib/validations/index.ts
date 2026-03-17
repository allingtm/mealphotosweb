// v3 validation schemas

// Dish management
export { createDishSchema, deleteDishSchema } from './dish';
export type { CreateDishInput } from './dish';

// Reactions & saves
export { reactionSchema } from './reaction';
export type { ReactionInput } from './reaction';
export { saveSchema } from './save';
export type { SaveInput } from './save';

// Comments
export { createCommentSchema, deleteCommentSchema } from './comment';
export type { CreateCommentInput } from './comment';

// Follows
export { followSchema } from './follow';
export type { FollowInput } from './follow';

// Menu
export { createMenuSectionSchema, createMenuItemSchema } from './menu';
export type { CreateMenuSectionInput, CreateMenuItemInput } from './menu';

// Search
export { searchSchema } from './search';
export type { SearchInput } from './search';

// Dish requests
export { createDishRequestSchema, upvoteDishRequestSchema } from './dish-request';
export type { CreateDishRequestInput } from './dish-request';

// Map
export { mapPinsSchema } from './map';
export type { MapPinsInput } from './map';

// Business
export {
  businessTypeSchema,
  businessTypeGroupSchema,
  businessProfileCreateSchema,
  businessProfileUpdateSchema,
  businessOnboardSchema,
} from './business';
export type { BusinessProfileCreateInput, BusinessOnboardInput } from './business';

// Profile & reports
export { profileUpdateSchema, reportSchema } from './profile';
export type { ReportReason, ProfileUpdateInput } from './profile';

// Auth
export { signUpSchema, signInSchema, resetPasswordSchema, updatePasswordSchema, PASSWORD_MIN_LENGTH } from './auth';

// Notifications
export { notificationQuerySchema, markReadSchema, NOTIFICATION_TYPES } from './notification';
export type { NotificationType } from './notification';

// Admin
export { adminMemberSearchSchema, adminMemberUpdateSchema, adminMealUpdateSchema, adminMealsPaginationSchema } from './admin';

// Contact
export { contactSubmissionSchema, adminContactQuerySchema, adminContactUpdateSchema } from './contact';
export type { ContactSubmissionInput } from './contact';

// Invite codes
export { validateInviteCodeSchema, createInviteCodeSchema, updateInviteCodeSchema } from './invite-code';
