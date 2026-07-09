let ioServer = null;

function setSocketServer(io) {
  ioServer = io;
}

function eventRoom(eventId) {
  return `event:${eventId}`;
}

function broadcastSeatUpdate(eventId, seatNumber, status) {
  if (!ioServer) {
    return;
  }

  ioServer.to(eventRoom(eventId)).emit('seat:status-changed', {
    seatNumber,
    status,
  });
}

function broadcastAdminUpdate() {
  if (!ioServer) {
    return;
  }

  ioServer.to('admin-room').emit('admin:booking-changed');
}

// Notifies everyone (catalog list + anyone viewing this specific event) that
// an admin created/edited/deleted an event, so clients can refetch instead
// of showing stale seat maps, prices, or themes.
function broadcastCatalogChanged(eventId) {
  if (!ioServer) {
    return;
  }

  ioServer.emit('events:changed', { eventId: eventId ? String(eventId) : null });
}

module.exports = {
  broadcastAdminUpdate,
  broadcastCatalogChanged,
  broadcastSeatUpdate,
  eventRoom,
  setSocketServer,
};
