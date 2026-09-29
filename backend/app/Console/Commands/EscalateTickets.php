<?php

namespace App\Console\Commands;

use App\Http\Controllers\TicketController;
use App\Models\Ticket;
use App\Models\TicketHistory;
use Carbon\Carbon;
use Illuminate\Console\Command;

class EscalateTickets extends Command
{
    protected $signature = 'tickets:escalate';

    protected $description = 'Naikkan prioritas tiket aktif yang melewati target SLA';

    public function handle(): int
    {
        $order = ['ringan', 'mendesak', 'darurat'];
        $now = Carbon::now();
        $escalated = 0;

        $tickets = Ticket::whereIn('status', ['pending', 'in_progress'])->get();

        foreach ($tickets as $ticket) {
            $days = TicketController::PRIORITY_SLA_DAYS[$ticket->priority] ?? 3;
            if ($now->lessThanOrEqualTo($ticket->created_at->copy()->addDays($days)->endOfDay())) {
                continue;
            }

            $idx = array_search($ticket->priority, $order);
            if ($idx === false || $idx >= count($order) - 1) {
                continue; // sudah darurat: tetap, menunggu tindakan admin
            }

            $old = $ticket->priority;
            $ticket->priority = $order[$idx + 1];
            $ticket->save();

            TicketHistory::create([
                'ticket_id' => $ticket->id,
                'actor_id' => null,
                'from_status' => $ticket->status,
                'to_status' => $ticket->status,
                'note' => "Eskalasi otomatis: prioritas {$old} → {$ticket->priority} (melewati target SLA)",
            ]);

            $escalated++;
        }

        $this->info("{$escalated} tiket dieskalasi.");

        return self::SUCCESS;
    }
}
