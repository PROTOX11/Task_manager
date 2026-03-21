"use client";

import { useAuth } from "@/lib/auth-context";
import { useData } from "@/lib/data-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Check, X, Mail, Clock } from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";

export default function InvitationsPage() {
  const { user } = useAuth();
  const { requests, respondToRequest } = useData();

  const myRequests = requests.filter((r) => r.recipient.id === user?.id);
  const pendingRequests = myRequests.filter((r) => r.status === "pending");
  const pastRequests = myRequests.filter((r) => r.status !== "pending");

  const handleAccept = (requestId: string) => {
    respondToRequest(requestId, true);
    toast.success("Invitation accepted!");
  };

  const handleReject = (requestId: string) => {
    respondToRequest(requestId, false);
    toast.info("Invitation declined");
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Invitations</h1>
        <p className="text-muted-foreground">
          Manage your project invitations and requests
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Pending Invitations
          </CardTitle>
          <CardDescription>
            {pendingRequests.length} pending invitation
            {pendingRequests.length !== 1 && "s"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {pendingRequests.map((request) => (
              <div
                key={request.id}
                className="flex items-start gap-4 rounded-lg border p-4"
              >
                <Avatar>
                  <AvatarFallback>
                    {getInitials(request.sender.firstName, request.sender.lastName)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">
                      {request.sender.firstName} {request.sender.lastName}
                    </p>
                    <Badge variant="secondary">Pending</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Wants to join{" "}
                    <span className="font-medium">{request.project.name}</span>
                  </p>
                  {request.message && (
                    <p className="mt-2 text-sm italic text-muted-foreground">
                      &ldquo;{request.message}&rdquo;
                    </p>
                  )}
                  <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {format(parseISO(request.createdAt), "MMM d, yyyy 'at' h:mm a")}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleReject(request.id)}
                  >
                    <X className="mr-1 h-4 w-4" />
                    Decline
                  </Button>
                  <Button size="sm" onClick={() => handleAccept(request.id)}>
                    <Check className="mr-1 h-4 w-4" />
                    Accept
                  </Button>
                </div>
              </div>
            ))}
            {pendingRequests.length === 0 && (
              <div className="py-8 text-center text-muted-foreground">
                <Mail className="mx-auto mb-2 h-8 w-8" />
                <p>No pending invitations</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {pastRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Past Invitations</CardTitle>
            <CardDescription>Previously handled invitations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pastRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center gap-4 rounded-lg border p-3 opacity-60"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {getInitials(request.sender.firstName, request.sender.lastName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {request.sender.firstName} {request.sender.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {request.project.name}
                    </p>
                  </div>
                  <Badge
                    variant={request.status === "accepted" ? "default" : "destructive"}
                  >
                    {request.status === "accepted" ? "Accepted" : "Declined"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
