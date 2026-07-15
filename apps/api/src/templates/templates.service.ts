import { Injectable, OnModuleInit } from '@nestjs/common';
import { EntityRepository } from '../common/entity.repository';

export interface TemplateReq {
  id: string;
  candidate: string;
  district: string;
  message: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  date: string;
  messageType?: string;
  templateName?: string;
  [key: string]: any;
}

const COLLECTION = 'dlt_templates';

@Injectable()
export class TemplatesService implements OnModuleInit {
  constructor(private readonly repo: EntityRepository) {}

  async onModuleInit(): Promise<void> {
    await this.repo.seedIfEmpty<TemplateReq>(COLLECTION, [
      { id: 'DLT-882', candidate: 'Rahul Sharma', district: 'Pune', message: 'Dear Voter, Join Rahul Sharma on 12th July for the Pune Gram Panchayat election rally. Your vote matters!', status: 'Pending', date: 'Today, 10:30 AM', messageType: 'SMS', templateName: 'Election_Greeting_2026' },
      { id: 'DLT-904', candidate: 'Priya Singh', district: 'Nashik', message: "Greetings! Click here to download Priya Singh's development manifesto for Nashik East.", status: 'Pending', date: 'Yesterday', messageType: 'WhatsApp', templateName: 'WhatsApp_Manifesto_Launch' },
      { id: 'DLT-711', candidate: 'Amit Kumar', district: 'Nagpur', message: 'Listen to the vision of Amit Kumar for clean water and better roads in Nagpur South.', status: 'Pending', date: 'Yesterday', messageType: 'SMS', templateName: 'IVR_Audio_Script' },
    ]);
  }

  list(limit = 5000, offset = 0): Promise<TemplateReq[]> {
    return this.repo.all<TemplateReq>(COLLECTION, limit, offset);
  }

  create(data: Partial<TemplateReq>): Promise<TemplateReq> {
    const tmpl: TemplateReq = {
      ...data,
      id: data.id || `DLT-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1e6).toString(36).toUpperCase()}`,
      candidate: data.candidate || 'Unknown',
      district: data.district || '-',
      message: data.message || '',
      status: (data.status as TemplateReq['status']) || 'Pending',
      date: data.date || 'Just now',
    } as TemplateReq;
    return this.repo.insert(COLLECTION, tmpl);
  }

  setStatus(id: string, status: TemplateReq['status']): Promise<TemplateReq | undefined> {
    return this.repo.patch<TemplateReq>(COLLECTION, id, { status });
  }
}
