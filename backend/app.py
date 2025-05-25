from flask import Flask, request, jsonify, session
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import Column, Integer, String, ForeignKey, Table, DateTime, Text
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
import os

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///project_management.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = os.urandom(24) # Generate a random secret key
db = SQLAlchemy(app)
Base = declarative_base()

# Association Table for User and Team many-to-many relationship
team_members = Table('team_members', Base.metadata,
    Column('user_id', Integer, ForeignKey('user.id'), primary_key=True),
    Column('team_id', Integer, ForeignKey('team.id'), primary_key=True)
)

class User(Base):
    __tablename__ = 'user'
    id = Column(Integer, primary_key=True)
    username = Column(String(80), unique=True, nullable=False)
    password_hash = Column(String(120), nullable=False)
    email = Column(String(120), unique=True, nullable=False)
    role = Column(String(80), nullable=False)
    name = Column(String(120), nullable=False)
    tasks = relationship('Task', backref='assignee', lazy=True)
    teams = relationship('Team', secondary=team_members, backref='members', lazy='dynamic')

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

class Client(Base):
    __tablename__ = 'client'
    id = Column(Integer, primary_key=True)
    name = Column(String(120), nullable=False)
    contact_info = Column(String(200))
    projects = relationship('Project', backref='client', lazy=True)

class Team(Base):
    __tablename__ = 'team'
    id = Column(Integer, primary_key=True)
    name = Column(String(120), nullable=False, unique=True)
    projects = relationship('Project', backref='team', lazy=True)

class Project(Base):
    __tablename__ = 'project'
    id = Column(Integer, primary_key=True)
    name = Column(String(120), nullable=False)
    client_id = Column(Integer, ForeignKey('client.id'), nullable=False)
    team_id = Column(Integer, ForeignKey('team.id'), nullable=False)
    status = Column(String(80), nullable=False, default='Pending')
    deadline = Column(DateTime)
    description = Column(Text)
    creation_date = Column(DateTime, default=datetime.utcnow)
    tasks = relationship('Task', backref='project', lazy=True)
    milestones = relationship('ProjectMilestone', backref='project', lazy=True)

class Task(Base):
    __tablename__ = 'task'
    id = Column(Integer, primary_key=True)
    project_id = Column(Integer, ForeignKey('project.id'), nullable=False)
    name = Column(String(120), nullable=False)
    assignee_id = Column(Integer, ForeignKey('user.id'), nullable=True)
    due_date = Column(DateTime)
    status = Column(String(80), nullable=False, default='To Do')
    description = Column(Text)

class ProjectMilestone(Base):
    __tablename__ = 'project_milestone'
    id = Column(Integer, primary_key=True)
    project_id = Column(Integer, ForeignKey('project.id'), nullable=False)
    name = Column(String(120), nullable=False)
    date = Column(DateTime, nullable=False)

class Feedback(Base):
    __tablename__ = 'feedback'
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('user.id'), nullable=True)
    name = Column(String(100), nullable=True)
    email = Column(String(100), nullable=True)
    subject = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    submission_date = Column(DateTime, nullable=False, default=datetime.utcnow)

    user = relationship('User', backref='feedbacks', lazy=True)

def init_db():
    Base.metadata.create_all(bind=db.engine)

@app.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    email = data.get('email')
    name = data.get('name')
    role = data.get('role', 'user') # Default role to 'user'

    if not all([username, password, email, name]):
        return jsonify({'message': 'Missing required fields'}), 400

    if User.query.filter_by(username=username).first():
        return jsonify({'message': 'Username already exists'}), 409
    if User.query.filter_by(email=email).first():
        return jsonify({'message': 'Email already exists'}), 409

    new_user = User(username=username, email=email, name=name, role=role)
    new_user.set_password(password)
    db.session.add(new_user)
    db.session.commit()

    return jsonify({'message': 'User registered successfully'}), 201

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({'message': 'Username and password are required'}), 400

    user = User.query.filter_by(username=username).first()

    if user and user.check_password(password):
        session['user_id'] = user.id
        return jsonify({
            'message': 'Login successful',
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'name': user.name,
                'role': user.role
            }
        }), 200
    else:
        return jsonify({'message': 'Invalid username or password'}), 401

@app.route('/logout', methods=['GET']) # Changed to GET as it's a simple request to clear session
def logout():
    session.pop('user_id', None)
    return jsonify({'message': 'Logout successful'}), 200

# --- Authentication Decorator ---
from functools import wraps

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'message': 'Authentication required'}), 401
        return f(*args, **kwargs)
    return decorated_function

# Example protected route
@app.route('/protected')
@login_required
def protected_route():
    return jsonify({'message': f'Hello user {session["user_id"]}, you are accessing a protected route!'})

# --- Helper function to convert Project object to dictionary ---
def project_to_dict(project):
    return {
        'id': project.id,
        'name': project.name,
        'client_id': project.client_id,
        'team_id': project.team_id,
        'status': project.status,
        'deadline': project.deadline.isoformat() if project.deadline else None,
        'description': project.description,
        'creation_date': project.creation_date.isoformat() if project.creation_date else None,
        # Add related tasks and milestones if needed in the future
        'tasks': [task.id for task in project.tasks], # Example: just task IDs
        'milestones': [milestone.id for milestone in project.milestones] # Example: just milestone IDs
    }

# --- Project Management API Endpoints ---

@app.route('/api/projects', methods=['POST'])
@login_required
def create_project():
    data = request.get_json()
    if not data or not data.get('name') or not data.get('status'):
        return jsonify({'message': 'Missing required fields: name and status'}), 400

    # Validate client_id if provided
    client_id = data.get('client_id')
    if client_id and not Client.query.get(client_id):
        return jsonify({'message': f'Client with id {client_id} not found'}), 404

    # Validate team_id if provided
    team_id = data.get('team_id')
    if team_id and not Team.query.get(team_id):
        return jsonify({'message': f'Team with id {team_id} not found'}), 404
        
    deadline = datetime.fromisoformat(data.get('deadline')) if data.get('deadline') else None


    new_project = Project(
        name=data['name'],
        client_id=client_id,
        team_id=team_id,
        status=data['status'],
        deadline=deadline,
        description=data.get('description')
        # creation_date is handled by default in the model
    )
    db.session.add(new_project)
    db.session.commit()
    return jsonify(project_to_dict(new_project)), 201

@app.route('/api/projects', methods=['GET'])
@login_required
def list_projects():
    query = Project.query

    # Filtering
    client_id = request.args.get('client_id')
    if client_id:
        query = query.filter_by(client_id=client_id)

    team_id = request.args.get('team_id')
    if team_id:
        query = query.filter_by(team_id=team_id)

    status = request.args.get('status')
    if status:
        query = query.filter_by(status=status)

    projects = query.all()
    return jsonify([project_to_dict(project) for project in projects]), 200

@app.route('/api/projects/<int:project_id>', methods=['GET'])
@login_required
def get_project(project_id):
    project = Project.query.get(project_id)
    if not project:
        return jsonify({'message': 'Project not found'}), 404
    return jsonify(project_to_dict(project)), 200

@app.route('/api/projects/<int:project_id>', methods=['PUT'])
@login_required
def update_project(project_id):
    project = Project.query.get(project_id)
    if not project:
        return jsonify({'message': 'Project not found'}), 404

    data = request.get_json()
    if not data:
        return jsonify({'message': 'No data provided for update'}), 400

    # Validate client_id if provided
    if 'client_id' in data:
        client_id = data['client_id']
        if client_id is not None and not Client.query.get(client_id):
            return jsonify({'message': f'Client with id {client_id} not found'}), 404
        project.client_id = client_id

    # Validate team_id if provided
    if 'team_id' in data:
        team_id = data['team_id']
        if team_id is not None and not Team.query.get(team_id):
            return jsonify({'message': f'Team with id {team_id} not found'}), 404
        project.team_id = team_id

    project.name = data.get('name', project.name)
    project.status = data.get('status', project.status)
    project.description = data.get('description', project.description)
    
    if 'deadline' in data:
        project.deadline = datetime.fromisoformat(data['deadline']) if data['deadline'] else None

    db.session.commit()
    return jsonify(project_to_dict(project)), 200

@app.route('/api/projects/<int:project_id>', methods=['DELETE'])
@login_required
def delete_project(project_id):
    project = Project.query.get(project_id)
    if not project:
        return jsonify({'message': 'Project not found'}), 404

    # Optional: Add checks here if there are related entities (e.g., tasks) that should prevent deletion
    # For now, direct deletion.
    db.session.delete(project)
    db.session.commit()
    return jsonify({'message': 'Project deleted successfully'}), 204 # 204 No Content is often used for successful deletions

# --- Helper function to convert Task object to dictionary ---
def task_to_dict(task):
    return {
        'id': task.id,
        'project_id': task.project_id,
        'name': task.name,
        'assignee_id': task.assignee_id,
        'due_date': task.due_date.isoformat() if task.due_date else None,
        'status': task.status,
        'description': task.description,
        'project_name': task.project.name, # Include project name
        'assignee_name': task.assignee.name if task.assignee else None # Include assignee name
    }

# --- Task Management API Endpoints ---

@app.route('/api/projects/<int:project_id>/tasks', methods=['POST'])
@login_required
def create_task_for_project(project_id):
    project = Project.query.get(project_id)
    if not project:
        return jsonify({'message': f'Project with id {project_id} not found'}), 404

    data = request.get_json()
    if not data or not data.get('name') or not data.get('status'):
        return jsonify({'message': 'Missing required fields: name and status'}), 400

    assignee_id = data.get('assignee_id')
    if assignee_id and not User.query.get(assignee_id):
        return jsonify({'message': f'User with id {assignee_id} not found to be assignee'}), 404

    due_date = datetime.fromisoformat(data.get('due_date')) if data.get('due_date') else None

    new_task = Task(
        project_id=project_id,
        name=data['name'],
        assignee_id=assignee_id,
        due_date=due_date,
        status=data['status'],
        description=data.get('description')
    )
    db.session.add(new_task)
    db.session.commit()
    return jsonify(task_to_dict(new_task)), 201

@app.route('/api/projects/<int:project_id>/tasks', methods=['GET'])
@login_required
def list_tasks_for_project(project_id):
    project = Project.query.get(project_id)
    if not project:
        return jsonify({'message': f'Project with id {project_id} not found'}), 404

    tasks = Task.query.filter_by(project_id=project_id).all()
    return jsonify([task_to_dict(task) for task in tasks]), 200

@app.route('/api/tasks/<int:task_id>', methods=['PUT'])
@login_required
def update_task(task_id):
    task = Task.query.get(task_id)
    if not task:
        return jsonify({'message': 'Task not found'}), 404

    data = request.get_json()
    if not data:
        return jsonify({'message': 'No data provided for update'}), 400

    if 'assignee_id' in data:
        assignee_id = data['assignee_id']
        if assignee_id is not None and not User.query.get(assignee_id):
            return jsonify({'message': f'User with id {assignee_id} not found as assignee'}), 404
        task.assignee_id = assignee_id

    task.name = data.get('name', task.name)
    task.status = data.get('status', task.status)
    task.description = data.get('description', task.description)

    if 'due_date' in data:
        task.due_date = datetime.fromisoformat(data['due_date']) if data['due_date'] else None

    db.session.commit()
    return jsonify(task_to_dict(task)), 200

@app.route('/api/tasks/<int:task_id>', methods=['DELETE'])
@login_required
def delete_task(task_id):
    task = Task.query.get(task_id)
    if not task:
        return jsonify({'message': 'Task not found'}), 404

    db.session.delete(task)
    db.session.commit()
    return jsonify({'message': 'Task deleted successfully'}), 204

# --- Helper function to convert User object to a short dictionary ---
def user_to_dict_short(user):
    return {
        'id': user.id,
        'username': user.username,
        'name': user.name
    }

# --- Helper function to convert Client object to dictionary ---
def client_to_dict(client):
    return {
        'id': client.id,
        'name': client.name,
        'contact_info': client.contact_info,
        'projects': [project.id for project in client.projects] # IDs of related projects
    }

# --- Helper function to convert Team object to dictionary ---
def team_to_dict(team):
    return {
        'id': team.id,
        'name': team.name,
        'projects': [project.id for project in team.projects], # IDs of related projects
        'members': [user_to_dict_short(member) for member in team.members]
    }

# --- Client Management API Endpoints ---

@app.route('/api/clients', methods=['POST'])
@login_required
def create_client():
    data = request.get_json()
    if not data or not data.get('name'):
        return jsonify({'message': 'Missing required field: name'}), 400

    new_client = Client(
        name=data['name'],
        contact_info=data.get('contact_info')
    )
    db.session.add(new_client)
    db.session.commit()
    return jsonify(client_to_dict(new_client)), 201

@app.route('/api/clients', methods=['GET'])
@login_required
def list_clients():
    clients = Client.query.all()
    return jsonify([client_to_dict(client) for client in clients]), 200

@app.route('/api/clients/<int:client_id>', methods=['GET'])
@login_required
def get_client(client_id):
    client = Client.query.get(client_id)
    if not client:
        return jsonify({'message': 'Client not found'}), 404
    return jsonify(client_to_dict(client)), 200

@app.route('/api/clients/<int:client_id>', methods=['PUT'])
@login_required
def update_client(client_id):
    client = Client.query.get(client_id)
    if not client:
        return jsonify({'message': 'Client not found'}), 404

    data = request.get_json()
    if not data:
        return jsonify({'message': 'No data provided for update'}), 400

    client.name = data.get('name', client.name)
    client.contact_info = data.get('contact_info', client.contact_info)

    db.session.commit()
    return jsonify(client_to_dict(client)), 200

@app.route('/api/clients/<int:client_id>', methods=['DELETE'])
@login_required
def delete_client(client_id):
    client = Client.query.get(client_id)
    if not client:
        return jsonify({'message': 'Client not found'}), 404

    # TODO: Consider implications for projects linked to this client.
    # For example, prevent deletion if projects are linked, or set project.client_id to null.
    # Currently, projects with this client_id will have a dangling reference or may cause an error
    # if there's a foreign key constraint without ON DELETE SET NULL or CASCADE.
    # For now, we'll proceed with direct deletion.
    
    # Check if client is linked to any projects
    if client.projects:
        return jsonify({
            'message': 'Cannot delete client. Client is linked to existing projects. Please reassign or delete those projects first.'
        }), 400


    db.session.delete(client)
    db.session.commit()
    return jsonify({'message': 'Client deleted successfully'}), 204

# --- Team Management API Endpoints ---

@app.route('/api/teams', methods=['POST'])
@login_required
def create_team():
    data = request.get_json()
    if not data or not data.get('name'):
        return jsonify({'message': 'Missing required field: name'}), 400

    if Team.query.filter_by(name=data['name']).first():
        return jsonify({'message': f'Team with name "{data["name"]}" already exists'}), 409

    new_team = Team(name=data['name'])
    db.session.add(new_team)
    db.session.commit()
    return jsonify(team_to_dict(new_team)), 201

@app.route('/api/teams', methods=['GET'])
@login_required
def list_teams():
    teams = Team.query.all()
    return jsonify([team_to_dict(team) for team in teams]), 200

@app.route('/api/teams/<int:team_id>', methods=['GET'])
@login_required
def get_team(team_id):
    team = Team.query.get(team_id)
    if not team:
        return jsonify({'message': 'Team not found'}), 404
    return jsonify(team_to_dict(team)), 200

@app.route('/api/teams/<int:team_id>', methods=['PUT'])
@login_required
def update_team(team_id):
    team = Team.query.get(team_id)
    if not team:
        return jsonify({'message': 'Team not found'}), 404

    data = request.get_json()
    if not data or not data.get('name'):
        return jsonify({'message': 'Missing required field: name'}), 400
    
    new_name = data['name']
    if new_name != team.name and Team.query.filter_by(name=new_name).first():
        return jsonify({'message': f'Team with name "{new_name}" already exists'}), 409

    team.name = new_name
    db.session.commit()
    return jsonify(team_to_dict(team)), 200

@app.route('/api/teams/<int:team_id>', methods=['DELETE'])
@login_required
def delete_team(team_id):
    team = Team.query.get(team_id)
    if not team:
        return jsonify({'message': 'Team not found'}), 404

    # TODO: Consider implications for projects or users linked to this team.
    # For now, simple deletion.
    if team.projects:
         return jsonify({
            'message': 'Cannot delete team. Team is linked to existing projects. Please reassign or delete those projects first.'
        }), 400
    
    # Also consider if team members should be handled or if the association table handles it.
    # SQLAlchemy's default behavior for many-to-many (if not cascaded) is to remove associations.

    db.session.delete(team)
    db.session.commit()
    return jsonify({'message': 'Team deleted successfully'}), 204

@app.route('/api/teams/<int:team_id>/members', methods=['POST'])
@login_required
def add_team_member(team_id):
    team = Team.query.get(team_id)
    if not team:
        return jsonify({'message': 'Team not found'}), 404

    data = request.get_json()
    if not data or 'user_id' not in data:
        return jsonify({'message': 'Missing required field: user_id'}), 400

    user_id = data['user_id']
    user = User.query.get(user_id)
    if not user:
        return jsonify({'message': 'User not found'}), 404

    if user in team.members:
        return jsonify({'message': 'User is already a member of this team'}), 409

    team.members.append(user)
    db.session.commit()
    return jsonify({
        'message': 'User added to team successfully',
        'team': team_to_dict(team)
    }), 200

@app.route('/api/teams/<int:team_id>/members/<int:user_id>', methods=['DELETE'])
@login_required
def remove_team_member(team_id, user_id):
    team = Team.query.get(team_id)
    if not team:
        return jsonify({'message': 'Team not found'}), 404

    user = User.query.get(user_id)
    if not user:
        return jsonify({'message': 'User not found'}), 404

    if user not in team.members:
        return jsonify({'message': 'User is not a member of this team'}), 404

    team.members.remove(user)
    db.session.commit()
    return jsonify({
        'message': 'User removed from team successfully',
        'team': team_to_dict(team) 
    }), 200

# --- Helper function to convert User object to a full dictionary for profile ---
def user_to_dict_full(user):
    return {
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'name': user.name,
        'role': user.role,
        'teams': [team.id for team in user.teams], # Example: IDs of teams user is part of
        'tasks_assigned_count': len(user.tasks) # Example: count of tasks assigned
    }

# --- User Profile Management API Endpoints ---

@app.route('/api/profile', methods=['GET'])
@login_required
def get_current_user_profile():
    user_id = session.get('user_id')
    # @login_required should ensure user_id is present, but an extra check is good practice
    if not user_id: 
        return jsonify({'message': 'Authentication required'}), 401 

    user = User.query.get(user_id)
    if not user:
        # This case should ideally not be reached if session and @login_required work correctly
        return jsonify({'message': 'User not found'}), 404
    
    return jsonify(user_to_dict_full(user)), 200

@app.route('/api/profile', methods=['PUT'])
@login_required
def update_current_user_profile():
    user_id = session.get('user_id')
    if not user_id: # Should be caught by @login_required
        return jsonify({'message': 'Authentication required'}), 401

    user = User.query.get(user_id)
    if not user:
        return jsonify({'message': 'User not found'}), 404 # Should not happen

    data = request.get_json()
    if not data:
        return jsonify({'message': 'No data provided for update'}), 400

    # Update fields
    user.name = data.get('name', user.name)
    
    # Handle email update with uniqueness check
    new_email = data.get('email')
    if new_email and new_email != user.email:
        if User.query.filter_by(email=new_email).first():
            return jsonify({'message': 'Email address already in use by another account'}), 409
        user.email = new_email
    
    # Update role - consider if this should be restricted based on current user's role (e.g., only admin can change roles)
    # For now, allowing user to change their own role as per basic requirement
    user.role = data.get('role', user.role)
    
    # Note: Password changes are not handled here.

    db.session.commit()
    return jsonify(user_to_dict_full(user)), 200

@app.route('/api/users', methods=['GET'])
@login_required
def get_all_users():
    try:
        users = User.query.all()
        # user_to_dict_short returns { 'id': user.id, 'username': user.username, 'name': user.name }
        # which is suitable for this use case.
        return jsonify([user_to_dict_short(user) for user in users]), 200
    except Exception as e:
        # Basic error logging, in a real app use app.logger.error() or similar
        print(f"Error fetching users: {str(e)}") 
        return jsonify({'message': 'Error fetching users', 'error': str(e)}), 500

@app.route('/api/tasks', methods=['GET'])
@login_required
def get_all_tasks():
    try:
        # Query all tasks and join with Project and User (assignee) to get their names
        tasks = db.session.query(Task, Project.name.label('project_name'), User.name.label('assignee_name')) \
            .join(Project, Task.project_id == Project.id) \
            .outerjoin(User, Task.assignee_id == User.id) \
            .all()

        tasks_list = []
        for task_obj, project_name, assignee_name in tasks:
            task_dict = {
                'id': task_obj.id,
                'project_id': task_obj.project_id,
                'project_name': project_name,
                'name': task_obj.name,
                'assignee_id': task_obj.assignee_id,
                'assignee_name': assignee_name if assignee_name else 'N/A',
                'due_date': task_obj.due_date.isoformat() if task_obj.due_date else None,
                'status': task_obj.status,
                'description': task_obj.description
            }
            tasks_list.append(task_dict)
        
        return jsonify(tasks_list), 200
    except Exception as e:
        print(f"Error fetching all tasks: {str(e)}")
        return jsonify({'message': 'Error fetching tasks', 'error': str(e)}), 500

# --- HTML Serving Routes ---
from flask import render_template

@app.route('/dashboard', methods=['GET'])
@login_required # Ensure user is logged in to see the dashboard
def serve_dashboard():
    return render_template('dashboard.html')

@app.route('/archivio', methods=['GET'])
@login_required
def serve_archivio():
    return render_template('archivio.html')

@app.route('/feedback', methods=['GET'])
@login_required
def serve_feedback():
    return render_template('feedback.html')

@app.route('/profilo', methods=['GET'])
@login_required
def serve_profilo():
    return render_template('profilo.html')

@app.route('/report', methods=['GET'])
@login_required
def serve_report():
    return render_template('report.html')

@app.route('/scheda-sito', methods=['GET'])
@login_required
def serve_scheda_sito():
    # project_id = request.args.get('project_id')
    # is_new = request.args.get('new') == 'true'
    # You might want to pass project_id or a new flag to the template
    # For now, just rendering. JavaScript will handle fetching data or form for new.
    return render_template('scheda-sito.html')

@app.route('/task-page', methods=['GET']) # Renamed from /task to avoid conflict with potential /api/tasks
@login_required
def serve_task_page():
    return render_template('task.html')

@app.route('/team-page', methods=['GET']) # Renamed from /team to avoid conflict with potential /api/teams
@login_required
def serve_team_page():
    return render_template('team.html')

@app.route('/login_page', methods=['GET'])
def serve_login_page():
    # If user is already logged in and tries to access login_page, redirect to dashboard
    if 'user_id' in session:
        return redirect(url_for('serve_dashboard'))
    return render_template('login.html')

# Need to import redirect and url_for
from flask import redirect, url_for


@app.route('/api/feedback', methods=['POST'])
def submit_feedback():
    data = request.get_json()
    if not data:
        return jsonify({'message': 'Nessun dato inviato'}), 400

    subject = data.get('subject')
    message = data.get('message')

    if not subject or not message:
        return jsonify({'message': 'Oggetto e messaggio sono obbligatori'}), 400

    name = data.get('name') # Optional
    email = data.get('email') # Optional
    user_id_val = session.get('user_id', None) # Optional, from session

    new_feedback = Feedback(
        subject=subject,
        message=message,
        name=name,
        email=email,
        user_id=user_id_val
    )

    try:
        db.session.add(new_feedback)
        db.session.commit()
        return jsonify({'message': 'Feedback inviato con successo!'}), 201
    except Exception as e:
        db.session.rollback()
        print(f"Error saving feedback: {str(e)}") # Basic logging
        return jsonify({'message': 'Errore durante il salvataggio del feedback'}), 500


if __name__ == '__main__':
    # Ensure Base is correctly used if models are defined after db.init_app or similar
    # For this structure, Base.metadata.create_all(bind=db.engine) within init_db and app_context is fine.
    with app.app_context():
        init_db()
    app.run(debug=True)
