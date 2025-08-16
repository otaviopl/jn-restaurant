export type ItemStatus = 'todo'|'in_progress'|'done'|'canceled'
export interface OrderItem { id:string; name:string; qty:number; status:ItemStatus }
export interface Order { id:string; customer:string; status:'todo'|'in_progress'|'done'; items:OrderItem[]; createdAt:string }