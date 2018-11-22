# learnyouarobot
An interactive robotics programming lesson webapp. Supports multiple (RoboRIO) deploy targets, deploy queueing (users have to wait for other users to finish using the robot), premade lessons to start from, build and RIOLog output, and syntax highlighting and formatting (very similar to Visual Studio Code, because we embed monaco.)

## Adding your own lessons
Lessons are standalone files, and are defined in `lessons.toml`. All lessons must have a different filename, even if they are in different origin folders. If you want your lessons to be able to be something other than a `Robot` class, you may specify an alternate robot class that runs the user's code. See `lessons.toml` and `lessons/` for more examples.
