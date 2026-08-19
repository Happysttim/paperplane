export type MailRole = {
  from: string;
  subject: string;
  contents: string;
  hasFile: boolean;
  options: MailRoleOptions | undefined;
};

export type MailRoleOptions = {
  startTime: string;
  endTime: string;
};
