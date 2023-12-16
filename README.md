# Deploying Full stack (ReactJS, ExpressJS & PostgreSQL) on Ubuntu 22.04

> Detailed step by step procedure to deploying full stack app on Ubuntu 22.04 with NGINX

## 1. Create a PostgreSQL in AWS RDS
Save the database connect url.
```
postgresql://USER:PASSWORD@HOST:PORT/DATABASE
```
Replace the USER, PASSWORD, HOST and DATABASE with your AWS RDS database details. Postgres default port will be 5432
## 2. Create a EC2 Instance in AWS

Connect EC2 Instance with your terminal using SSH
```
ssh -i [path/to/file.pem] ubuntu@[ec2-ip-address]
```

Update packages
```
sudo apt update && sudo apt upgrade -y
```

## 3. Copy github repo to sever

Find a place to store your application code. In this example in the `ubuntu` home directory a new directory called `apps` will be created. Within the new `apps` directory another directory called `aws-todo-app`. Feel free to store your application code anywhere you see fit

```
cd ~
mkdir apps
cd apps
mkdir aws-todo-app
```

move inside the `aws-todo-app` directory and clone the project repo
```
cd aws-todo-app
git clone https://github.com/prajilk/aws-todo-app.git .
```

## 4. Install Node on Ubuntu using snap
To install Node on Ubuntu follow the steps detailed in: https://github.com/nodejs/snap

```
cd ~
sudo snap install node --classic
```
Check if the Node.js and NPM is installed using these command:
```
node -v
npm -v
```
It will show the version of node and npm if the installation was successfull.

## 5. Install and Configure PM2
We never want to run *node* directly in production. Instead we want to use a process manager like PM2 to handle running our backend server. PM2 will be responsible for restarting the App if/when it crashes :grin:

```
sudo npm install pm2 -g
```
Point pm2 to the location of the server.js file so it can start the app. We can add the `--name` flag to give the process a descriptive name
```
pm2 start /home/ubuntu/apps/aws-todo-app/server/app.js --name aws-todo-app
```

Configure PM2 to automatically startup the process after a reboot

```
ubuntu@ip-172-31-20-1:~$ pm2 startup
[PM2] Init System found: systemd
[PM2] To setup the Startup Script, copy/paste the following command:
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u ubuntu --hp /home/ubuntu
```
The output above gives you a specific command to run, copy and paste it into the terminal. The command given will be different on your machine depending on the username, so do not copy the output above, instead run the command that is given in your output.

```
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u ubuntu --hp /home/ubuntu
```

Verify that the App is running

```
pm2 status
```
After verify App is running, save the current list of processes so that the same processes are started during bootup. If the list of processes ever changes in the future, you'll want to do another `pm2 save`

```
pm2 save
```

## 6. Deploy React Frontend
Navigate to the client directory in our App code and run `npm run build`. 

```
cd /apps/aws-todo-app/client
npm run build
```

This will create a finalized production ready version of our react frontend in directory called `build`, I am using vite for this project so the folder name will be `dist` instead of `build`. The `dist` folder is what the NGINX server will be configured to serve.

```
ubuntu@ip-172-31-20-1:~/apps/aws-todo-app/client$ ls
README.md  dist  node_modules  package-lock.json  package.json  public  src
ubuntu@ip-172-31-20-1:~/apps/aws-todo-app/client$ cd dist/
ubuntu@ip-172-31-20-1:~/apps/aws-todo-app/client/dist$ ls
asset-manifest.json  index.html manifest.json  precache-manifest.ee13f4c95d9882a5229da70669bb264c.js  robots.txt  service-worker.js  static
ubuntu@ip-172-31-20-1:~/apps/aws-todo-app/client/dist$
```

## 7. Install and Configure NGINX

Install and enable NGINX
```
sudo apt install nginx -y
sudo systemctl enable nginx
```

NGINX is a feature-rich webserver that can serve multiple websites/web-apps on one machine. Each website that NGINX is responsible for serving needs to have a seperate server block configured for it.

Navigate to '/etc/nginx/sites-available'

```
cd /etc/nginx/sites-available
```

There should be a server block called `default`

```
ubuntu@ip-172-31-20-1:/etc/nginx/sites-available$ ls
default 
```
The default server block is what will be responsible for handling requests that don't match any other server blocks. Right now if you navigate to your server ip, you will see a pretty bland html page that says NGINX is installed. That is the `default` server block in action. 

We will need to configure a new server block for our website. To do that let's create a new file in `/etc/nginx/sites-available/` directory. We can call this file whatever you want, but I recommend that you name it the same name as your domain name for your app. In this example i am not using any domian so i will name the file as `aws-todo-app`. But instead of creating a brand new file, since most of the configs will be fairly similar to the `default` server block, I recommend copying the `default` config.

```
cd /etc/nginx/sites-available
sudo cp default aws-todo-app
```

open the new server block file `aws-todo-app` and modify it so it matches below:

```
server {
        listen 80;
        listen [::]:80;

         root /home/ubuntu/apps/aws-todo-app/client/build;

        # Add index.php to the list if you are using PHP
        index index.html index.htm index.nginx-debian.html;

        server_name sanjeev.xyz www.sanjeev.xyz;

        location / {
                try_files $uri /index.html;
        }

         location /api {
            proxy_pass http://localhost:5000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }

}
```

**Let's go over what each line does**

The first two lines `listen 80` and `listen [::]:80;` tell nginx to listen for traffic on port 80 which is the default port for http traffic. Note that I removed the `default_server` keyword on these lines. If you want this server block to be the default then keep it in

`root /home/ubuntu/apps/aws-todo-app/client/build;` tells nginx the path to the index.html file it will server. Here we passed the path to the build directory in our react app code. This directory has the finalized html/js/css files for the frontend.

`server_name [c2-ip-address];` tells nginx what domain names it should listen for. Make sure to replace this with your specific domains. If you don't have a domain then you can put the ip address of your ubuntu server.

The configuration block below is needed due to the fact that React is a Singe-Page-App. So if a user directly goes to a url that is not the root url like `https://aws-todo-app.com/todo/1` you will get a 404 cause NGINX has not been configured to handle any path ohter than the `/`. This config block tells nginx to redirect everything back to the `/` path so that react can then handle the routing.

```
        location / {
                try_files $uri /index.html;
        }
```

The last section is so that nginx can handle traffic destined to the backend. Notice the location is for `/api`. So any url with a path of `/api` will automatically follow the instructions associated with this config block. The first line in the config block `proxy_pass http://localhost:5000;` tells nginx to redirect it to the localhost on port 5000 which is the port that our backend process is running on. This is how traffic gets forwarded to the Node backend. If you are using a different port, make sure to update that in this line.

**Enable the new site**
```
sudo ln -s /etc/nginx/sites-available/aws-todo-app /etc/nginx/sites-enabled/
systemctl restart nginx
```
Verify Nginx syntax is ok using the following command
```
sudo nginx -t
```

## 8. Configure Environment Variables
We now need to make sure that all of the proper environment variables are setup on our production Ubuntu Server. In our development environment, we made use of a package called dotenv to load up environment variables. In the production environment the environment variables are going to be set on the OS instead of within Node. 

Create a file called `.env` in `/home/ubuntu/`. The file does not need to be named `.env` and it does not need to be stored in `/home/ubuntu`, these were just the name/location of my choosing. The only thing I recommend avoid doing is placing the file in the same directory as the app code as we want to make sure we don't accidentally check our environment variables into git and end up exposing our credentials.

Within the .env file paste all the required environment variables

```
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE
```

You'll notice I also set `NODE_ENV=production`. Although its not required for this example project, it is common practice. For man other projects(depending on how the backend is setup) they may require this to be set in a production environment.


In the `/home/ubuntu/.profile` add the following line to the bottom of the file

```
set -o allexport; source /home/ubuntu/.env; set +o allexport
```

For these changes to take affect, close the current terminal session and open a new one. 

Verify that the environment variables are set by running the `printenv`

```
printenv
```

## 9. Enable Firewall

```
sudo ufw status
sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow https
sudo ufw enable
sudo ufw status
```
