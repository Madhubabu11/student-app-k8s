kubectl label node kind-worker ingress-ready=true
kubectl port-forward svc/ingress-nginx-controller -n ingress-nginx 8080:80 --address=0.0.0.0
kubectl get pods -n notes-app
kubectl get endpoints -n notes-app
kubectl describe svc notes-app-service -n notes-app
kubectl get ingress -n student-app -o yaml
