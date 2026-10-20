export type ParsedHeader = {
  key: string;
  value: string;
};

export type ParsedAttachment = {
  filename: string;
  contentType: string;
  size: number;
};

export type NormalizeMailBody = {
  headers: ParsedHeader[];
  from: {
    name: string;
    address: string;
  };
  subject: string;
  date: string;
  content: string;
  attachments: ParsedAttachment[];
};

export type RouteEmailBody = NormalizeMailBody & {
  envelope: {
    from: string;
    recipients: string[];
  };
  contentSize: number;
};

export type DeliveryRecordBody = {
  eventId: string;
  source: string;
  destination: string;
  messageId: string;
  status: 'sent' | 'failed' | 'retrying';
  detail?: string;
};

export type Response = {
  status: 'ok' | 'failed';
};

export type RouteForward =
  | {
      status: 'ok';
      data: {
        source: string;
        destination: string;
        matches: boolean;
      }[];
    }
  | {
      status: 'failed';
    };
